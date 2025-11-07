# Claude Artifacts - Official Documentation
**Source:** https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them  
**Downloaded:** 2025-10-25  
**Status:** Current as of October 2025

---

## What are artifacts?

Accessing artifacts in the sidebar and Claude-powered artifacts are supported on **free, Pro, Max, and Claude for Work (Team and Enterprise) plans**.

Artifacts allow you to turn ideas into shareable apps, tools, or content—build tools, visualizations, and experiences by simply describing what you need. Claude can share substantial, standalone content with you in a dedicated window separate from the main conversation. This makes it easy for you to work with significant pieces of content that you may want to modify, build upon, or reference later.

### Characteristics of Artifact Content

Claude creates an artifact when the content it is sharing has the following characteristics:

- **Significant and self-contained** - typically over 15 lines of content
- **Likely to be edited, iterated on, or reused** outside the conversation
- **Complex piece of content** that stands on its own without requiring extra conversation context
- **Content you are likely to want to refer back to** or use later on

### Common Examples of Artifact Content

- Documents (Markdown or Plain Text)
- Code snippets
- Websites (single page HTML)
- Scalable Vector Graphics (SVG) images
- Diagrams and flowcharts
- Interactive React components

---

## How do I create and manage artifacts?

### For free, Pro, and Max plan users

You can access all your artifacts through the dedicated artifacts space in your Claude sidebar. This space allows you to:

- View all your creations in one organized location
- Browse Anthropic-created artifacts for inspiration
- Create new artifacts from scratch or by customizing existing ones
- Manage and organize your artifact collection

### For Claude for Work users

In addition to the above, **Team and Enterprise users** can:

- Share artifacts securely with other members of the same organization
- Browse work-focused artifacts for inspiration

---

## Working with artifacts

When Claude creates an artifact, you'll see the artifact content displayed in the dedicated window to the right side of the main chat.

### Edit and Iterate

- **Ask Claude to modify or update** the artifact content
- **Changes appear directly** in the artifact window
- **Switch between different versions** using the version selector
- **Your edits won't change Claude's memory** of the original content
- **Edit prior chat messages** to create a different version of a chat history, with its own set of Artifacts. This lets you easily create different versions of an Artifact without fear of losing your previous work.

### View and Export

These options are in the **lower right corner** of the artifact window:

- View the underlying code of any artifact
- Copy content to your clipboard
- Download files to use outside the conversation

### Multiple Artifacts

- Open and work with several artifacts in one conversation
- Use the chat controls (slider icon in upper right) to switch between them
- Select which artifact you want Claude to reference for updates

---

## Editing artifacts with the analysis tool enabled

**Note:** This functionality requires the analysis tool feature. For more information on enabling this feature, see the [analysis tool documentation](https://support.anthropic.com/en/articles/10008684-enabling-and-using-the-analysis-tool).

With the analysis tool feature enabled, Claude can make targeted changes to specific sections of an artifact instead of rewriting it entirely. There are two ways to edit artifacts:

### 1. Targeted Updates

For **small changes to specific sections**, Claude can update just that portion while leaving the rest unchanged.

- Simply describe what you want changed and where
- **Example:** "Could you change the color of the button from red to blue?"
- **Example:** "Update the first paragraph to include a problem statement."

### 2. Full Rewrites

For **major changes affecting most of the content**, Claude can rewrite a new version.

- Better for substantial restructuring or when multiple sections need to change
- **Example:** "Could you completely redesign the button to be a toggle instead?"
- **Example:** "Could you rewrite this technical documentation to be a customer-facing FAQ instead?"

In both cases, each edit creates a **new version** that you can access through the version selector, letting you track changes while you work.

### Best Practices

- Be specific about which part you want to change
- For targeted updates, reference unique identifying text around your desired change
- Consider whether a small update or full rewrite would be more appropriate for your needs

---

## Creating Claude-powered artifacts

You can also build artifacts that **embed AI capabilities**, turning them into **AI-powered apps**. Users of your artifacts can access Claude's intelligence through a text-based API—answering questions, generating creative content, providing personalized coaching, playing games, solving problems, and adapting responses based on input.

When you share these AI-powered artifacts, others can use them immediately—**no API keys, no costs to you**. Whether your artifact helps 10 people or 10,000, it's **completely free to share**.

**For Claude for Work (Team and Enterprise plan) users:** When you share AI-powered artifacts within your organization, team members can use them without incurring additional costs to the creator. Usage counts against each user's existing team limits.

### To create artifacts with AI capabilities:

1. **You describe what you want**
2. **Claude writes the code**
3. **The app runs on Anthropic's infrastructure**
4. **Users authenticate with their Claude account** and interact with their own instance of the artifact
5. **Their usage counts against their Claude subscription** (you do not pay for their usage)

### What you can do:

- Call a Claude API
- Process PDFs, images, and text-based files
- Create rich UIs with React
- See, fork, and customize any artifact

### What you can't do:

- Make external API calls to third-party services (Note: Some limited forms of external network connections are still possible)
- Use persistent storage

---

## MCP Integration and Persistent Storage

**Available on:** Pro, Max, Team, and Enterprise plans on Claude web and desktop

Artifacts can connect to external services through the **Model Context Protocol (MCP)**, enabling interactive applications that read from and write to tools like:

- Asana
- Google Calendar
- Slack
- Any custom MCP servers you've configured

### Permission Management

- Users control which tools each artifact can access through **granular permission settings**
- When an artifact needs to access an MCP tool, you'll be prompted to approve access on first interaction
- Your preferences persist for subsequent uses of that artifact

**Important:** Each user must authenticate MCP servers independently, even when using shared or published artifacts.

### Organization Control

- Organization admins can enable or disable artifacts MCP at the organization level
- Admins cannot manage which specific MCP servers artifacts can use

---

## Key Takeaways

**When to use artifacts:**
- Content over 15 lines
- Self-contained work
- Needs editing/iteration
- Will be referenced later
- Complex standalone content

**Artifact types:**
- Code (any language)
- Documents (Markdown/Plain Text)
- HTML webpages (with CSS/JS)
- SVG images
- Diagrams/flowcharts
- React components
- AI-powered apps

**How artifacts work:**
- Appear in dedicated sidebar window
- Editable through conversation
- Version control built-in
- Downloadable/exportable
- Shareable (with permissions)
- Can integrate with MCP tools

**Best practices:**
- Be specific about what you want
- Use targeted updates for small changes
- Use full rewrites for major changes
- Reference unique text for updates
- Enable analysis tool for better editing

---

## Additional Resources

For more information about building and sharing AI-powered apps with Claude, see the [official guides](https://www.anthropic.com/news/build-artifacts).

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-25  
**Source:** Anthropic Support Center
