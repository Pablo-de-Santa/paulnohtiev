// Editable, scripted interview answers. Personal details are limited to Paul's supplied brief.
export const interview = {
  "About Paul": [
    [
      "Tell me about yourself",
      "I’m Paul Nohtiev, a professional web developer. I enjoy building unusual, interactive experiences like this one. Away from the screen, I love nature, mountains, and spending time with Odie.",
    ],
    [
      "Why did you build this world?",
      "I wanted you to explore something I enjoy instead of only reading a portfolio. Space, pixel games, mountains and a quiet camp all belong here. There’s a real Tower Defense game in the cabin, too.",
    ],
    [
      "How do you approach a new project?",
      "First I clarify the problem and the people using the product. Then I sketch the smallest useful flow, build it, and test it. I refine the structure and details as I learn what works.",
    ],
    [
      "Where can I see your experience?",
      "The computer inside the cabin has my résumé and portfolio links. This outdoor laptop is where I’m working on the world. Come inside to explore the documents.",
    ],
  ],
  "JavaScript & TypeScript": [
    [
      "How does the event loop work?",
      "JavaScript runs a task to completion. After that task, queued microtasks such as Promise callbacks run before the next task. Long work still blocks input and rendering, so I split it up or move suitable computation to a worker.",
    ],
    [
      "What is a closure?",
      "A closure keeps access to the lexical scope where a function was created. It’s useful for private state and callbacks. I also watch for stale values and callbacks that keep large objects alive unnecessarily.",
    ],
    [
      "Why use TypeScript?",
      "TypeScript makes contracts explicit and catches many mistakes before runtime. I prefer meaningful domain types and narrowing over assertions. Data from the network still needs runtime validation: types alone cannot make an API response trustworthy.",
    ],
    [
      "How do you handle async failures?",
      "I model loading, success and error states explicitly, cancel obsolete requests, and prevent older results overwriting newer ones. Retries depend on the operation; a failed payment and a failed image download need different handling.",
    ],
  ],
  "Modern frontend": [
    [
      "How do you improve performance?",
      "Measure first. I look at loading, responsiveness, rendering and memory, then fix the biggest bottleneck. For this world that means shared geometry, bounded particle counts, lazy game loading and pausing hidden rendering.",
    ],
    [
      "What makes a UI accessible?",
      "Semantic controls, keyboard navigation, visible focus, meaningful names and readable contrast come first. Motion needs a reduced-motion option. Dynamic messages should be announced without reading every typed character aloud.",
    ],
    [
      "How do you test a frontend?",
      "Test domain logic in isolation, then test the important user journeys in a browser. I include error states and keyboard or touch input. Tests should verify behavior rather than mirror every implementation detail.",
    ],
    [
      "How do you keep dependencies manageable?",
      "Each dependency should solve a real problem. I check its maintenance, bundle impact and integration cost, keep boundaries around it, and remove unused code. This portfolio uses vanilla JavaScript, Three.js and GSAP.",
    ],
  ],
  "Frontend architecture": [
    [
      "Where should state live?",
      "Keep state close to the feature that owns it. Share it when several features genuinely need the same information. Separate server data, temporary UI state and domain rules so one change doesn’t ripple through everything.",
    ],
    [
      "How would you structure a large app?",
      "I start with feature boundaries and clear public interfaces. Rendering, data access and business rules have different responsibilities. A shared layer should contain stable, reusable concepts, not become a drawer for everything.",
    ],
    [
      "How do you design API boundaries?",
      "Validate incoming data, translate transport details into domain types, and make failures explicit. Components should not need to know every backend quirk. That makes changes easier to test and contain.",
    ],
    [
      "When would you use micro-frontends?",
      "Only when independent teams and release cycles justify their coordination and runtime costs. A well-structured single application is often simpler. Architecture should serve the organization and users, not just a diagram.",
    ],
  ],
  Angular: [
    [
      "What does dependency injection do?",
      "Angular injectors provide dependencies to components and services. Provider scope controls which consumers share an instance. I choose that scope deliberately so feature-local state does not accidentally become application-wide.",
    ],
    [
      "How do you structure components?",
      "Give each component a clear responsibility and explicit inputs and outputs. Keep domain rules separate from template details. Standalone components can import their own template dependencies directly.",
    ],
    [
      "When would you use RxJS?",
      "RxJS is useful for asynchronous event streams, cancellation and composition. For example, switchMap can discard an obsolete search request when the query changes. I clean up subscriptions or use framework-managed bindings.",
    ],
    [
      "How do you organize routes?",
      "Routes are useful feature boundaries. Load large features on demand, make loading and failure states clear, and handle authorization on the server as well. A route guard improves the experience; it is not a security boundary.",
    ],
  ],
  "Modern Angular": [
    [
      "Signals or computed values?",
      "A signal holds reactive state. A computed value derives state from signals and caches its result until its dependencies change. I use computed values for derivations and reserve effects for synchronizing with non-reactive APIs.",
    ],
    [
      "What is zoneless Angular?",
      "Zoneless Angular relies on explicit notifications instead of ZoneJS to schedule change detection. Signals read by templates, bound listeners, AsyncPipe and markForCheck are examples of notifications. Third-party integrations must notify Angular when their state changes.",
    ],
    [
      "Signals and RxJS together?",
      "Signals work well for synchronous reactive state used by a view. Observables handle asynchronous streams and their operators. I bridge them at clear boundaries rather than repeatedly converting back and forth.",
    ],
    [
      "How do you approach modernization?",
      "Upgrade in measured steps, follow the official migration guidance, and protect critical flows with tests. Standalone components and clearer reactive state can simplify a codebase, but changes should fit the existing application.",
    ],
  ],
};
export const guide = [
  {
    id: "paul",
    title: "Paul’s picnic",
    text: "Walk over and talk to Paul. Ask about the camp or browse the interview topics. His outdoor laptop shows his work; the résumé is on the cabin computer.",
  },
  {
    id: "dog",
    title: "Odie",
    text: "Meet Odie and choose sit, lie down, speak, roll over or spin. He stays out of the pond. Give him a treat for being a good companion.",
  },
  {
    id: "clock",
    title: "Cabin clock",
    text: "Inside the cabin, choose morning, afternoon, evening or night. Restore current time to follow your local clock. Movement pauses while the lighting changes.",
  },
  {
    id: "calendar",
    title: "Calendar",
    text: "Choose a season inside the cabin, or restore the current season. Watch the snow, leaves, clothing and warm drink change together.",
  },
  {
    id: "fire",
    title: "Campfire",
    text: "Toast a marshmallow while staying beside the fire. Eat it after it turns golden; leave it too long and it burns. The separate indoor fireplace can be lit or put out.",
  },
  {
    id: "fish",
    title: "Pond",
    text: "Feed the fish from the shore. Food travels from your hand into the water, where the fish gather. In winter they rest beneath the ice.",
  },
  {
    id: "computer",
    title: "Cabin computer",
    text: "Open the cabin door and step inside to browse Paul’s résumé and links. The radio controls music, and the wall switch controls the light.",
  },
  {
    id: "arcade",
    title: "Tower Defense",
    text: "The arcade beside the bed opens Paul’s full game. Camp sounds pause while you play. Back to camp returns you to your visit.",
  },
];
export function campGreeting(hour, season, index = 0) {
  const night = hour >= 19 || hour < 5;
  const lines = [
    "Have you tried my Tower Defense game? The arcade is inside the cabin.",
    "Have you talked to Odie? He knows a few tricks.",
    "There’s a marshmallow waiting by the fire. Stay close while it toasts!",
    "The clock and calendar inside let you try another time or season.",
    "You can switch the cabin light off, or settle beside its fireplace.",
    night
      ? "Beautiful aurora tonight, eh? Look up for a shooting star."
      : "A lovely day to be outside. Watch how the sunlight moves across the camp.",
    season === "winter"
      ? "The pond is frozen. Odie brought his scarf, and I have hot chocolate."
      : "You can feed the fish from the shore. Watch where the food lands!",
  ];
  return lines[index % lines.length];
}
