from __future__ import annotations

"""channel.py
A **Channel** represents a group chat between multiple LLM *Agents* working
collaboratively on the same *task*.  One special *guiding agent* (also called
*moderator* or *facilitator*) is responsible for:

1. Driving the conversation by asking follow-up questions or providing
   guidance.
2. Deciding when the group has reached a consensus.

The conversation is allowed to run for at most *max_rounds* exchanges.  If no
consensus is declared by then, the channel stops and returns the last guidance
from the moderator as a best-effort answer.

The protocol that the guiding agent follows is intentionally simple and
string-based so that we can decide—without complex parsing—whether consensus
has been reached.  After seeing participants' replies, the guiding agent must
start its answer with either of the two sentinel strings (case-insensitive):

    CONSENSUS_REACHED: <final answer here>
    CONTINUE_DISCUSSION: <short guidance here>
    CONSENSUS_FAILED: <summary of disagreements and best guess>

The helper method `_parse_guidance` extracts the status + content so that
`run()` can decide to continue or terminate the loop.

NOTE:
-----
This implementation **does not** enforce that the guiding agent *actually*
respects the protocol.  If its answer cannot be parsed, the channel will assume
that consensus has not been reached and will continue until *max_rounds* is
hit.
"""

from dataclasses import dataclass
import logging
import re
from typing import List, Dict, Tuple, Optional

from .agent import Agent

logger = logging.getLogger(__name__)


@dataclass
class ChannelConfig:
    """Configuration options for a Channel."""

    max_rounds: int = 8  # Hard upper-bound for the discussion length
    guiding_system_prompt: str | None = None  # Optional extra system prompt for the moderator
    participant_system_prompt: str | None = None  # Optional extra system prompt for each participant


class Channel:
    """Orchestrates collaborative reasoning among multiple *Agents*."""

    def __init__(
        self,
        task: str,
        guiding_agent: Agent,
        participant_agents: List[Agent],
        config: ChannelConfig | None = None,
    ) -> None:
        if guiding_agent in participant_agents:
            raise ValueError("Guiding agent must not be part of participant_agents list.")

        if len(participant_agents) == 0:
            raise ValueError("At least one participant agent is required.")

        self.task = task.strip()
        self.guiding_agent = guiding_agent
        self.participants = participant_agents
        self.config = config or ChannelConfig()
        self.rounds_executed: int = 0  # will be updated by run()
        self.stopped: bool = False  # True if consensus or round limit reached

        # Historical messages per agent; used to preserve conversational context.
        # Each value is a *list* of OpenAI-style {role, content} dictionaries.
        self._history: Dict[Agent, List[Dict[str, str]]] = {
            agent: [] for agent in [self.guiding_agent, *self.participants]
        }

    def run(self) -> str:
        """Execute the multi-agent conversation and return the final answer.

        Returns
        -------
        str
            Either the *final agreed-upon answer* or a best-effort summary if
            the maximum number of rounds is exceeded.
        """

        for round_idx in range(1, self.config.max_rounds + 1):
            self.rounds_executed = round_idx
            logger.debug("Starting round %s", round_idx)

            # 1. Ask every participant for their latest contribution.
            participant_msgs = self._collect_participant_responses(round_idx)

            # 2. Ask the moderator to decide what happens next.
            guidance_raw = self._request_guidance(participant_msgs, round_idx)
            status, content = self._parse_guidance(guidance_raw)

            if status == "CONSENSUS_REACHED":
                logger.info("Consensus reached in round %s", round_idx)
                self.stopped = True
                return content.strip()

            # If this was the last allowed round, we cannot iterate again.
            if round_idx == self.config.max_rounds:
                logger.warning("Reached round limit without consensus, requesting failure summary.")
                self.stopped = True
                failure_summary = self._request_failure_summary(participant_msgs)
                # Ensure it begins with sentinel; if not, prepend.
                if not failure_summary.upper().startswith("CONSENSUS_FAILED"):
                    failure_summary = f"CONSENSUS_FAILED: {failure_summary}"
                return failure_summary

            # Otherwise, keep going: append moderator guidance to every
            # participant's history so they can react next turn.
            for agent in self.participants:
                self._history[agent].append({"role": "assistant", "content": guidance_raw})

        # Exceeded max_rounds – return moderator's last answer or generic note.
        logger.warning("Max rounds reached without consensus.")
        return (
            content.strip()
            if content
            else "No consensus reached within the configured discussion limit."
        )

    def _collect_participant_responses(self, round_idx: int) -> List[Tuple[Agent, str]]:
        """Send the *task* plus conversational history to each participant.

        Returns
        -------
        List[Tuple[Agent, str]]
            A list of (agent, response) tuples.
        """
        participant_responses: List[Tuple[Agent, str]] = []

        if self.stopped:
            logger.warning("Channel stopped. No further participant responses will be collected.")
            return participant_responses

        # Collect responses from all participants before moving on to the guiding agent.
        for agent in self.participants:
            logger.debug(f"Collecting response from {agent.model}")
            messages = self._build_participant_prompt(agent, round_idx)
            response = agent.chat(messages) or ""
            logger.info(f"Response from {agent.model}: {response}")
            participant_responses.append((agent, response))

            # Update history.
            self._history[agent].append({"role": "assistant", "content": response})

        return participant_responses

    def _build_participant_prompt(self, agent: Agent, round_idx: int) -> List[Dict[str, str]]:
        """Compose the message list for a participant for this round."""
        messages: List[Dict[str, str]] = []

        # 1) System-level instructions (only once at the beginning for clarity)
        if round_idx == 1:
            system_prompt = (
                self.config.participant_system_prompt
                or (
                    "You are an expert AI assistant collaborating with other AI "
                    "agents to solve the following task. Provide clear, concise, "
                    "and well-reasoned answers. Do *not* attempt to mediate – "
                    "focus on presenting your own reasoning."
                )
            )
            messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "system", "content": f"TASK: {self.task}"})

        # 2) Include this agent's previous conversation history (already stored).
        messages.extend(self._history[agent])

        # 3) Additionally include *public* messages – i.e. responses from other
        # agents in the previous round.
        if round_idx > 1:
            others_content = []
            for other_agent, history in self._history.items():
                if other_agent is agent:
                    continue
                if history:
                    others_content.append(history[-1]["content"])
            if others_content:
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            "Here are the most recent replies from your fellow agents:\n" +
                            "\n---\n".join(others_content)
                        ),
                    }
                )

        # 4) End with a direct instruction.
        messages.append(
            {
                "role": "user",
                "content": (
                    "Round {round_idx}: Provide your next answer or refinement. "
                    "Keep it short (<200 words)."
                ).format(round_idx=round_idx),
            }
        )

        # Persist this user prompt in history for completeness.
        self._history[agent].append(messages[-1])
        return messages

    def _request_guidance(
        self, participant_msgs: List[Tuple[Agent, str]], round_idx: int
    ) -> str:
        """Ask the guiding agent to determine consensus and provide guidance."""

        if self.stopped:
            logger.warning("Channel stopped. No further guidance will be requested.")
            return "CONSENSUS_REACHED: Channel stopped."

        # Compose prompt for guiding agent.
        messages: List[Dict[str, str]] = []

        if round_idx == 1:
            system_prompt = (
                self.config.guiding_system_prompt
                or (
                    "You are the moderator for a panel of AI agents working "
                    "together to complete a task. After each round, you must "
                    "evaluate their responses and decide whether they have "
                    "reached consensus. Use the protocol below strictly:\n"\
                    "- Start your reply with \"CONSENSUS_REACHED:\" if they agree. "
                    "Immediately after the colon, state the final agreed-upon "
                    "answer in 1-3 sentences.\n"\
                    "- Otherwise, start with \"CONTINUE_DISCUSSION:\" followed by "
                    "short guidance on what disagreements remain and how they "
                    "might converge next round."
                )
            )
            messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "system", "content": f"TASK: {self.task}"})

        combined = []
        for idx, (_agent, content) in enumerate(participant_msgs, 1):
            combined.append(f"Agent{idx}: {content}")
        messages.append({"role": "user", "content": "\n".join(combined)})

        response = self.guiding_agent.chat(messages) or ""
        logger.info(f"Response from guiding agent ({self.guiding_agent.model}): {response}")

        self._history[self.guiding_agent].append({"role": "assistant", "content": response})
        return response

    @staticmethod
    def _parse_guidance(text: str) -> Tuple[str, Optional[str]]:
        """Return (status, content) where status ∈ {CONSENSUS_REACHED, CONTINUE_DISCUSSION, CONSENSUS_FAILED}.

        If parsing fails, we default to CONTINUE_DISCUSSION.
        """
        pattern = re.compile(r"^(CONSENSUS_REACHED|CONTINUE_DISCUSSION|CONSENSUS_FAILED)\s*:\s*(.*)", re.IGNORECASE | re.DOTALL)
        match = pattern.match(text.strip())
        if match:
            status = match.group(1).upper()
            content = match.group(2).strip()
            return status, content
        return "CONTINUE_DISCUSSION", None

    def _request_failure_summary(self, participant_msgs: List[Tuple[Agent, str]]) -> str:
        """Ask guiding agent for a final CONSENSUS_FAILED summary after limit.
        """
        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "The discussion round limit was reached without consensus. "
                    "Please provide a final summary in the exact format: "
                    "CONSENSUS_FAILED: <summary of disagreements and best guess>."
                ),
            }
        ]
        combined = []
        for idx, (_agent, content) in enumerate(participant_msgs, 1):
            combined.append(f"Agent{idx}: {content}")
        messages.append({"role": "user", "content": "\n".join(combined)})

        response = self.guiding_agent.chat(messages) or ""
        logger.info(f"Failure summary from guiding agent ({self.guiding_agent.model}): {response}")
        self._history[self.guiding_agent].append({"role": "assistant", "content": response})
        return response

    def __repr__(self) -> str:
        return (
            f"<Channel task='{self.task[:30]}...' participants={len(self.participants)} "
            f"max_rounds={self.config.max_rounds}>"
        )