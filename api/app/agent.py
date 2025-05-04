import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Agent:
    """
    An agent that interacts with LLM models via the OpenRouter API.
    """
    def __init__(self, model: str, site_url: str | None = None, site_name: str | None = None):
        """
        Initializes the Agent with a specific model and optional site information.

        Args:
            model (str): The identifier of the model to use (e.g., "openai/gpt-4o").
            site_url (str | None): Optional. Your site URL for OpenRouter rankings.
            site_name (str | None): Optional. Your site name/title for OpenRouter rankings.
        """
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set.")

        self.model = model
        self.extra_headers = {}
        if site_url:
            self.extra_headers["HTTP-Referer"] = site_url
        if site_name:
             self.extra_headers["X-Title"] = site_name

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

    def chat(self, messages: list[dict[str, str]]) -> str | None:
        """
        Sends a chat message sequence to the configured model and returns the response.

        Args:
            messages (list[dict[str, str]]): A list of message dictionaries,
                                             e.g., [{"role": "user", "content": "Hello!"}].

        Returns:
            str | None: The content of the model's response, or None if an error occurs.
        """
        try:
            completion = self.client.chat.completions.create(
                extra_headers=self.extra_headers if self.extra_headers else None,
                model=self.model,
                messages=messages
            )
            return completion.choices[0].message.content
        except Exception as e:
            # Basic error handling, consider more specific handling
            print(f"Error during API call: {e}")
            return None

    def chat_stream(self, messages: list[dict[str, str]]):
        """
        Sends a chat message sequence to the configured model and yields response chunks (streams).

        Args:
            messages (list[dict[str, str]]): A list of message dictionaries.

        Yields:
            str: Chunks of the model's response content.
        """
        try:
            stream = self.client.chat.completions.create(
                extra_headers=self.extra_headers if self.extra_headers else None,
                model=self.model,
                messages=messages,
                stream=True
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content is not None:
                    yield content
        except Exception as e:
            # Basic error handling, consider more specific handling
            print(f"\nError during streaming API call: {e}")
            # Optionally re-raise or handle differently
            # raise

# Example Usage (can be removed or placed in a separate example script)
if __name__ == '__main__':
    # Ensure you have OPENROUTER_API_KEY set in your .env file or environment
    try:
        # --- Non-streaming example ---
        print("--- Non-Streaming Example ---")
        agent = Agent(model="qwen/qwen3-235b-a22b:free", site_name="My Test Site")
        response = agent.chat([
            {"role": "user", "content": "Explain the concept of AI alignment briefly."}
        ])
        if response:
            print("Model Response:")
            print(response)
        print("\n" + "="*20 + "\n")

        # --- Streaming example ---
        print("--- Streaming Example ---")
        # Use a different model if desired, e.g., "openai/gpt-4o"
        streaming_agent = Agent(model="qwen/qwen3-235b-a22b:free", site_name="My Streaming Test")
        print(f"Streaming response from {streaming_agent.model}:")
        message_stream = streaming_agent.chat_stream([
             {"role": "user", "content": "Tell me a short story about a curious robot exploring an ancient library."}
        ])
        for chunk in message_stream:
            print(chunk, end="", flush=True)
        print() # Newline after stream finishes

    except ValueError as e:
        print(e)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
