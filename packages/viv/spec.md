# Vivgrid Agent API Response Spec

## Request Details

- **Method**: POST
- **URL**: https://api.vivgrid.com/v1/chat/completions
- **Headers**:
  - `X-Response-Format`: `vivgrid`
  - `Authorization`: `your-vivgrid-api-key`
- **Body**: Compatible with OpenAI API, see [OpenAI Official Documentation](https://platform.openai.com/docs/api-reference/chat/create#chat-create-messages) for details

## Response Format

The response is returned in a streaming format. Each chunk is separated by `\n\n` and follows the format `<prefix>: <data>`. The prefixes and their meanings are described below:

### Prefix Definitions

- **`f`**: The function call arguments, returning a JSON object with these fields:
  - `tool_call_id`: The unique ID of the function call
  - `name`: The name of the function being called
  - `arguments`: The arguments of the function call, presented as a string

- **`r`**: The result of a function call, returning a JSON object with these fields:
  - `tool_call_id`: Associated with the ID of the corresponding function call
  - `name`: The name of the function called
  - `result`: The execution result of the function call, presented as a string

- **`c`**: Message content, which are the message chunks from the LLM

- **`g`**: Reasoning content, which displays the reasoning process

- **`u`**: Token usage, returning a JSON object with these fields:
  - `prompt_tokens`: Number of tokens used in the prompt
  - `completion_tokens`: Number of tokens used in the completion
  - `total_tokens`: Total number of tokens used
  - `prompt_tokens_details`: Detailed information about prompt tokens, including `audio_tokens` and `cached_tokens`
  - `completion_tokens_details`: Detailed information about completion tokens, including `audio_tokens` and `reasoning_tokens`

- **`p`**: The end of the response, when `p: finish` is returned, it indicates the stream has ended

## Example

Here is a complete response example for a `get_weather`:

```plaintext
g: "Thinking"

g: "Thinking complete"

f: {"tool_call_id":"call_e6ZVNgqP0pbS0xlm781UbzNe","name":"get_weather","arguments":"{\"city\": \"New York\"}"}

f: {"status":"started","tool_call_id":"call_z9AxlKUJe14Po2YehUQETXEA","name":"get_weather","arguments":"{\"city\": \"London\"}"}

r: {"status":"completed","tool_call_id":"call_e6ZVNgqP0pbS0xlm781UbzNe","name":"get_weather","result":"New York: 25°C"}

r: {"status":"completed","tool_call_id":"call_z9AxlKUJe14Po2YehUQETXEA","name":"get_weather","result":"London: 22°C"}

c: "The"

c: " current"

c: " temperature"

c: " in"

c: " New"

c: " York"

c: " is"

c: " 25"

c: "°C"

c: " and"

c: " in"

c: " London"

c: " it's"

c: " 22"

c: "°C"

c: "."

u: {"prompt_tokens":150,"completion_tokens":60,"total_tokens":210,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"completion_tokens_details":{"audio_tokens":0,"reasoning_tokens":0}}

p: finish
```

### Example Explanation

1. **`g`**: Shows the reasoning process of the LLM, indicating it's analyzing the request.
2. **`f`**: Indicates a function call to retrieve weather data for New York and London.
3. **`r`**: Returns the results of the function calls with the temperatures for both cities.
4. **`c`**: Streams the final response token by token, constructing the complete sentence.
5. **`u`**: Provides details on token usage for the request and response.
6. **`p`**: Signals the end of the response stream with p: finish.