# Requ

**Write workflows as text, or let your AI write them.** An open-source diagram language for people and AI assistants designing how work gets done.

![Customer refund workflow with customer, AI-agent and support lanes](docs/readme-example.svg)

```requ
process refund "Customer refund"
lane customer "Customer" type=customer
lane agent "Refund agent" type=agent
lane support "Support" owner="Support lead"
customer.request: "Request a refund" start
agent.check: "Check refund policy"
support.approve: "Approve refund"
customer.receive: "Receive refund" end
request -> check -> approve : "eligible"
approve -> receive : "approved"
```

## Try it

**[Open the playground](https://requstory.com/dev/)** — edit an example, see the diagram, then share it or download SVG. **Copy for AI** gives ChatGPT or Claude the language guide and your source.

<!-- npm-release-pending -->

The npm/CDN release is pending publishing access. These commands will work after v0.1.0 is published; the playground is live now.

Save the example above as `workflow.requ`, then render it with Node 20 or later:

```sh
npx @requstory/cli@0.1.0 render workflow.requ -o workflow.svg
```

Or render Requ on a web page:

```html
<pre class="requ">
process hello "Hello Requ"
lane team "My team" owner="Team lead"
team.start: "Start here" start
</pre>
<script src="https://cdn.jsdelivr.net/npm/@requstory/web@0.1.0/dist/requ.global.js"></script>
<script>
  requ.run();
</script>
```

Use the parser and renderer in your own app with `npm install @requstory/core`.

## What you can draw

- **Swimlanes** for workflows across customers, teams and outside services.
- **Operating maps** with teams, handoffs and customer journeys.
- **AI-agent lanes** showing where agents take part in the work.
- **Lint checks** that flag gaps and explain syntax mistakes.

## Learn more

[Language guide](https://requstory.com/dev/guide.html) · [Examples with diagrams and source](https://requstory.com/dev/examples/) · [LLM reference](https://requstory.com/dev/llms.txt) · [Contributing](CONTRIBUTING.md)

MIT licensed. Built for [Requstory](https://requstory.com/).
