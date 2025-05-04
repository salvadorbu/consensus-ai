"""demo_consensus.py
Run a simple demonstration of the Channel class with multiple public OpenRouter
models.  Requires that you have set the environment variable `OPENROUTER_API_KEY`
(e.g. by creating a `.env` file in the project root).

Usage (after installing requirements):

    python -m app.demo_consensus

You will see the conversation progress logged (depending on your logging level)
and finally the agreed-upon answer or a message that no consensus was reached.
"""
from __future__ import annotations

import logging
from app.agent import Agent
from app.channel import Channel, ChannelConfig

logging.basicConfig(level=logging.INFO)  # Adjust to DEBUG for full details


def main() -> None:
    # Logical-liar puzzle task
    task = (
        "An island contains 24 people, all of whom are either truth-tellers or liars. We go around the island asking each person how many liars the island has. When we talk to the nth person (where n = 1, 2, 3, ..., 24), they say the total number of liars on the island is a multiple of n. For example, when we ask person 1 how many liars the island has, they say it is a multiple of 1. Person 2 says it is a multiple of 2, etc. How many liars does the island have?"
    )

    # Create agents (models must be accessible in your OpenRouter plan)
    guiding = Agent("qwen/qwen3-235b-a22b:free", site_name="Consensus-Demo")
    participants = [
        Agent("deepseek/deepseek-r1:free", site_name="Consensus-Demo"),
        Agent("deepseek/deepseek-chat:free", site_name="Consensus-Demo"),
        Agent("meta-llama/llama-3.3-70b-instruct:free", site_name="Consensus-Demo"),
    ]

    config = ChannelConfig(max_rounds=6)  # Limit discussion rounds
    channel = Channel(task, guiding, participants, config)

    answer = channel.run()
    print("\n================ FINAL ANSWER ================\n")
    print(answer)


if __name__ == "__main__":
    main()
