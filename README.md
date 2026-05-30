# Love Signal

Static frontend plus a Vercel Function that calls Anthropic without exposing the API key in the browser.

## Vercel setup

1. Push this folder to GitHub.
2. Import the repository from Vercel.
3. Add an Environment Variable in Vercel:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
4. Deploy.

The browser calls `/api/analyze`. The API key is read only inside `api/analyze.js`.

## Local development

Install the Vercel CLI, then run:

```bash
vercel dev
```

For local testing, create a `.env` file from `.env.example` and put your real `ANTHROPIC_API_KEY` there. Do not commit `.env`.
