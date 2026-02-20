import "./load-env";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

async function embed(text: string) {
    const r = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return r.data[0].embedding;
}

async function main() {
    // Remove existing CV chunks so re-run replaces them
    const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .contains("metadata", { source: "cv" });
    if (deleteError) console.warn("Could not delete old CV docs:", deleteError);

    const docs = [
        {
            content: `Pavlo Pohuliailo. Senior Software Engineer. Kyiv, Ukraine.
Contact: pavel.pogulailo@gmail.com, +380 (98) 318 71 34.
LinkedIn, GitHub, Upwork. Video Introduction available.`,
            metadata: { title: "CV - Contact", source: "cv", url: "local://cv", page: 1 },
        },
        {
            content: `Team Lead / Senior Software Engineer. Senior Software Engineer and Team Lead with 7+ years of experience building scalable web products. Strong in Next.js/React, Node.js/NestJS, TypeScript, microservices, and cloud (AWS/Azure) with CI/CD and production observability. Deep expertise in auth/security (SSO/SAML/OIDC, Microsoft Entra ID, RBAC) and third-party integrations. Also delivered Upwork projects ($5,000+ earned), building admin panels and full-stack integrations with Swagger/OpenAPI backends and real-time WebSocket data.`,
            metadata: { title: "CV - Summary", source: "cv", url: "local://cv", page: 1 },
        },
        {
            content: `Skills: JavaScript, TypeScript, Node.js, HTML, PUG, CSS. Nest.js, Express, Fastify. React, Vue, Next, Remix. MongoDB, PostgreSQL, AWS. RMQ, NATS, gRPC. Github Actions, CodePipeline. Kubernetes, Docker. Redis, Memcached. ElasticSearch, Kibana. Prometheus, Grafana. Redux, Redux-thunk. GRASP, GOF, OOP, SOLID. Puppeteer, Cheerio. Jest, WebDriverIo, Artillery.js. CQRS, DDD, Event Sourcing. Nginx. Auth0, PingOne. Data Structures & Algorithms. GIT, CodeCommit, BitBucket. REST, GraphQL, SOA. Tailwind, Styled Components. JWT, OAuth. GNU/Linux. Prisma, TypeORM. Scrum, Agile, Kanban. Project Management.`,
            metadata: { title: "CV - Skills", source: "cv", url: "local://cv", page: 1 },
        },
        {
            content: `Lead Software Engineer at EPAM Systems (Dec 2024 – Present). Defined system architecture and key technical decisions (scalability, security, reliability). Engineering standards and best practices: code style, testing, API conventions, documentation. Technical roadmap: epics, milestones, delivery plans. Led Agile/Scrum ceremonies (Sprint Planning, Daily Scrum, Backlog Refinement, Retrospective). Code reviews and implementation guidance. Team growth: technical interviews, onboarding, mentoring.`,
            metadata: { title: "CV - EPAM Lead", source: "cv", url: "local://cv", page: 2 },
        },
        {
            content: `Senior Software Engineer at EPAM Systems (Aug 2024 – Dec 2024). Built secure EdTech solution with AWS Lambda and API Gateway for QuickSight statistics. AI-driven modernization: migrating legacy (ASP.NET MVC/WebForms) to Next.js App Router microfrontends, TypeScript services. B2C e-commerce with Commercetools and Storyblok headless CMS. PoC for Identity Providers: Microsoft Entra, Ping Identity, Auth0 (SSO, MFA, passkeys). Internal AI marathon.`,
            metadata: { title: "CV - EPAM Senior", source: "cv", url: "local://cv", page: 2 },
        },
        {
            content: `Software Engineer at Upwork (Aug 2025 – Present). Admin panels for B2B (trading/fintech): React + TypeScript with Swagger/OpenAPI backends. Auth and RBAC, protected routes, session handling. Real-time market data via WebSockets + REST. Complex forms and workflows (buy/sell, orders, positions). Production on Next.js + Vercel + Postgres/pgvector. $5,000+ earned on Upwork.`,
            metadata: { title: "CV - Upwork", source: "cv", url: "local://cv", page: 2 },
        },
        {
            content: `Software Engineer at Devurai (Sep 2023 – Aug 2024). Zypto-Payment (B2B/B2C Cryptocurrency/Blockchain). Statistics service and admin panel for real-time monitoring: NestJS, GraphQL, MongoDB, Vue. Replaced legacy identity verification with SumSub. Decentralized auth with MetaMask wallet-based login. RabbitMQ for event-driven communication.`,
            metadata: { title: "CV - Devurai", source: "cv", url: "local://cv", page: 3 },
        },
        {
            content: `Software Engineer at Mapme (Feb 2022 – Sep 2023). B2B2C platform with microfrontend architecture (iframes). Migrated legacy Angular v1.9 to Vue 3. Dynamic data via Google Sheets integration.`,
            metadata: { title: "CV - Mapme", source: "cv", url: "local://cv", page: 3 },
        },
        {
            content: `Software Engineer at Miteyda (Oct 2020 – Feb 2022). B2C HRTech platform, led team of 4. Web scraping with Puppeteer and Cheerio. Stripe for payments and webhooks. CI/CD with GitHub Actions, Kubernetes on DigitalOcean.`,
            metadata: { title: "CV - Miteyda", source: "cv", url: "local://cv", page: 3 },
        },
        {
            content: `Software Engineer at Admiral Studio (May 2020 – Oct 2020). Microservices for B2C e-commerce (Cannabis): React, NestJS, TDD. Kubernetes deployment. Admin panel for harmreductioneurasia: JWT, SendGrid. Nginx, ReCaptcha bypass. Ecofficiency AgTech: .xlsx/.csv/.pdf analysis, OpenAI for CSV insights, MVP on Vercel. AWS: CodeDeploy, CodeBuild, CodePipeline, Elastic Beanstalk, Lambda, ELB, Route 53, ECR, ECS, S3.`,
            metadata: { title: "CV - Admiral Studio", source: "cv", url: "local://cv", page: 3 },
        },
        {
            content: `Certifications: Microservices - patterns and practice (Dec 2022). Microservices with Node, React, Docker and Kubernetes (June 2023). GitHub Actions - The Complete Guide (Aug 2024).`,
            metadata: { title: "CV - Certifications", source: "cv", url: "local://cv", page: 4 },
        },
        {
            content: `Languages: English (Upper-Intermediate), Ukrainian (Native), Russian (Native or bilingual).`,
            metadata: { title: "CV - Languages", source: "cv", url: "local://cv", page: 4 },
        },
        {
            content: `Education: Bachelor, National Aviation University, Kyiv – Computer Engineering.`,
            metadata: { title: "CV - Education", source: "cv", url: "local://cv", page: 4 },
        },
    ];

    for (const d of docs) {
        const embedding = await embed(d.content);
        const { error } = await supabase.from("documents").insert({
            content: d.content,
            metadata: d.metadata,
            embedding,
        });
        if (error) throw error;
    }

    console.log("Done. Ingested", docs.length, "chunks.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});