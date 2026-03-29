---
inclusion: always
---

# Command Execution Guidelines

## DO NOT Execute These Commands
Never use `executeBash` for commands that:

- Take a long time to complete (build commands, package commands, install commands).
- Start servers or watch processes.
- Run tests that might take time.
- Any `npm`/`npx` commands that could hang.

Instead, provide the exact command to the user, asking them to run it manually, for example:

    # Ask the user to run this
    npm run build
    npx vsce package

## Use Background Mode for Long‑Running Commands
If you **must** start a server, watch process, or any command that needs to stay running, **always** run it in the background by appending an ampersand (`&`). This prevents locking the session and allows other interactions to continue.

- **Incorrect** (blocks the session):

      npm run dev
      npx tailwindcss -i input.css -o output.css --watch

- **Correct** (background mode):

      npm run dev &
      npx tailwindcss -i input.css -o output.css --watch &

Only use background execution when it’s essential to start a persistent process. In most cases, you should still ask the user to run such commands themselves.

## Safe Commands Only
Continue using `executeBash` only for quick, one‑line commands that complete immediately, such as listing files (`ls`), reading file contents (`cat`), or simple scripts. Prefer using file tools for reading/editing files when available.

## Reason
Long‑running commands or watchers block the interactive chat interface, preventing further interaction. Running them in the background (or asking the user to run them) keeps the session responsive and avoids the need to forcibly terminate locked command sessions.

## Service Health Checks

Network requests can also hang if the target service isn’t responding. Use timeouts and background execution to avoid blocking the terminal:

~~~
# Quick status check with a 3‑second timeout
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://192.168.6.3:5175

# Run a status check in the background (no output captured)
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.6.3:5175 &

# GET a resource with a 5‑second timeout, printing the response body
curl --max-time 5 http://192.168.6.3:5175/api/status

# POST JSON data with a 10‑second timeout
curl --max-time 10 -X POST -H "Content-Type: application/json" \
  -d '{"foo":"bar"}' \
  http://192.168.6.3:5175/api/endpoint
~~~

Using `--max-time` (or `-m`) ensures `curl` fails fast if the service doesn’t respond; appending `&` runs the request in the background when you don’t need to capture its output.





