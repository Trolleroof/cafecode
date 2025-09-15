What Inspired Cafecode
In high school, I learned to teach myself mobile app development in order to build an AI tutoring app when ChatGPT’s API was just released to the world. And since it was my first time coding a project from scratch, I was pretty intimidated by the process.

Later as vibe coding came around, I began to build a scholarship scraper and felt like A.I. was pretty magical, allowing me to convert natural language prompts into code. But the problem was I couldn't understand what I was building. So if I came across a few bugs, it would take me days to squash them and move on.

This inspired me to create Cafecode, a platform It helps you build your own projects with AI. This time around, you are the one in the driver's seat with full control over the project, and the platform actually helps you understand what you're building.

Part of the inspiration came from observing how traditional coding bootcamps and online courses (through platforms like Codecademy) often use a one-size-fits-all approach that doesn't adapt to individual learning patterns. Additionally, learning by actually building is the most effective way to learn, but there are no platforms that make building projects a fun, intuitive, and addictive learning experience.

What I Learned
During this hackathon, I discovered the power of spec-driven development with Kiro. In my opinion, it's a pretty unique take on the AI coding IDE. I believe it has many strengths compared to its competitors that allow the user to create a product from scratch with proper planning and execution. The most profound learning was understanding how Kiro's contextual awareness can maintain code consistency across complex, multi-file projects. I also learned to leverage Kiro's incremental compilation hooks, a feature many developers overlook, which My frontend to be styled in a uniform way and allowed my backend code to be readable.

How I Built the Project
Cafécode is a full-stack AI coding tutor built with a microservices architecture across Next.js (frontend), Node/Express (backend), and Supabase (database). The frontend runs on Next.js 13+ with TypeScript, Tailwind, shadcn/ui, and a Monaco-based editor for a VS Code-like experience. It integrates WebContainer, a browser-native runtime that executes Node.js (and even Python) directly in the browser. This enables live terminals, npm installs, and file system operations and turns the browser into a development environment. An AI assistant powered by the Gemini API guides users through building projects step-by-step, offering context-aware hints, code fixes, and discusses project steps with the user.

The backend, built with Express.js and deployed on Fly.io in Dockerized services, handles AI orchestration, workspace management, Stripe payments, and file sync. Its modular route structure powers guided project creation, code analysis, file operations, and user auth, secured by a middleware stack with Helmet, CORS, rate limiting, and JWT verification against Supabase. Supabase itself provides Postgres with row-level security and real-time authentication, ensuring each user’s workspace is fully isolated. Real-time sync between the Monaco editor, file explorer, and terminal runs over WebSockets, while services like the Gemini integration layer, UserWorkspaceManager, and WebContainerSync give the system the scalability to support hundreds of users coding simultaneously in browser-native sandboxes.

Challenges Faced
The first challenge I encountered was making sure that I planned this app to be something that was intuitive for the user, so that way it wouldn’t come across as a disingenuous AI app that didn’t really push the user to learn.

Technically, implementing the terminal and file system was the toughest challenge. At first, I used WebSockets with node-pty, but it quickly became a mess to manage. Managing multiple tabs meant tracking connection states, handling reconnections, and avoiding race conditions. Also, finding duplicate keystrokes being echoed due to various issues. On top of that, running a separate shell process per tab was very resource-heavy and error-prone.

To fix scaling, I migrated to a web container, moving everything into the browser. This solved the server load but then created new challenges such as COP headers for security. This was a simpler fix as I was able to handle this and a hybrid file system sync so edits can feel instant in the web container but also stay consistent within the back-end.

Finally, I optimized the terminal sizing and responsiveness with Xtern, making sure that the dimensions were updated across all the tabs and devices. The result was a more scalable, browser-native terminal environment that was user-friendly.
