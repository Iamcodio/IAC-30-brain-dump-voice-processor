# IAC-30 BrainDump Voice Processor
## Version 3.0 - Strategic Pivot: Tauri + Rust Architecture

**Document Type:** Strategic Pivot & Product Requirements  
**Version:** 3.0.0  
**Date:** November 5, 2025  
**Status:** Active Development  
**Previous Version:** 2.5.0-beta1 (Electron architecture)

---

## Executive Summary

**Strategic Pivot:** Moving from Electron to Tauri + Rust core architecture to achieve:
- 93% smaller bundle size (10MB vs 140MB)
- Cross-platform support (Windows, Mac, Linux)
- Reusable core for future mobile expansion (iOS/Android)
- Faster startup and lower memory footprint

**Core Mission Unchanged:**
> "Black box recorder for people experiencing extreme trauma and loneliness"

---

## Why We're Pivoting

### Phase C1 Learnings (Electron Implementation)
**What Worked:**
- Clean manager-based architecture
- 92% test coverage
- Privacy profile concept validated
- Founder story positioning confirmed

**What Didn't:**
- 140MB bundle size (too heavy for "lightweight local tool")
- 150-200MB memory usage (excessive for background app)
- Three-runtime complexity (Electron + Python + native)
- Not suitable for mobile expansion

**Decision:** Keep the logic, change the platform.

---

## Version 3.0 Architecture

### Core Principle
**Reusable Rust Core + Platform-Specific UI**
```
┌─────────────────────────────────────┐
│ Rust Core Engine (Universal)       │
│ - Audio capture                     │
│ - Whisper C++ integration          │
│ - Privacy profile logic            │
│ - File management                  │
└─────────────────────────────────────┘
         ↓                    ↓
    Desktop UI          Mobile UI
  (Tauri+Svelte)    (Native/Flutter)
   Phase 3.1           Phase 3.2
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Core Engine | Rust | Memory safe, cross-platform, fast |
| Audio Capture | cpal crate | Cross-platform audio (replaces PyAudio) |
| Transcription | whisper-rs | Rust bindings to whisper.cpp |
| Desktop UI | Svelte | Compiles to HTML/CSS/JS, lightweight |
| Desktop Shell | Tauri | 10MB bundle, native APIs |
| Mobile UI | TBD (see Phase 3.2) | Native or Flutter options |

---

## Phase Breakdown

### Phase 3.1: Desktop Foundation (Tauri + Rust)

**Objective:** Replace Electron with Tauri, port Python to Rust

**Deliverables:**
- Rust core engine (audio + transcription)
- Tauri desktop shell (menu bar app)
- Svelte UI (recording interface)
- Cross-platform builds (Windows, Mac, Linux)

**Key Changes from C1:**
- No Python subprocess (pure Rust + Whisper C++)
- No Electron (Tauri instead)
- Single binary distribution per platform

**Success Criteria:**
- Works on macOS, Windows, Linux
- <10MB bundle size
- <50MB memory usage
- Recording → transcription functional

---

### Phase 3.2: Mobile Expansion

**Objective:** Bring BrainDump to iOS and Android

**Why React Native Was Wrong:**
PM (IamCodio) doesn't like React. Fair point - there are better alternatives that align more with Svelte's philosophy.

**Mobile Technology Options:**

#### Option A: Native Approach (Recommended for Long Term)
**Android:** Jetpack Compose (Kotlin) + Rust FFI
- Declarative UI similar to Svelte
- Compiles efficiently (no virtual DOM)
- Native performance
- Official Google recommendation
- Clean, modern syntax

**iOS:** SwiftUI (Swift) + Rust FFI
- Declarative UI similar to Svelte
- Native Apple framework
- PM wants Swift experience for Mac eventually
- Best performance on Apple hardware

**Pros:**
- Best performance possible
- Platform-specific optimizations
- Aligns with PM's preference (no React)
- PM wants Swift skills long-term

**Cons:**
- Two separate codebases (iOS + Android)
- More development time (2-3x longer than Flutter)
- Need to learn Kotlin + Swift
- Harder to maintain feature parity

#### Option B: Flutter (Dart) + Rust FFI (Recommended for MVP)
**Single codebase for both iOS and Android**

**Pros:**
- Declarative UI philosophy (similar to Svelte)
- NOT React-based (important)
- Compiles to native code
- Single codebase = faster time-to-market
- Good Rust FFI support
- Used by Google, BMW, Alibaba
- Easier to maintain feature parity
- One team can handle both platforms

**Cons:**
- Need to learn Dart (but similar to TypeScript)
- Not 100% native (98% there though)
- Slightly larger bundle than pure native

**Recommended Path:**
Start with **Option B (Flutter)** for faster MVP and market validation, then consider **Option A (Native)** for iOS when ready to invest in Swift skills and Mac-native tooling.

**Why This Makes Sense:**
1. Prove the product works (Flutter MVP)
2. Get paying customers
3. Validate business model
4. Then invest in native iOS (SwiftUI) for premium experience
5. Keep Android in Flutter (or port to Jetpack Compose if needed)

**Success Criteria:**
- Feature parity with desktop version
- <30MB app size (Flutter) or <20MB (Native)
- Works offline
- Privacy profiles functional
- On-device Whisper processing

---

### Phase 3.3: Privacy Profiles Implementation

**Objective:** Implement three-tier privacy system across all platforms

**Tiers:**
1. **FREE** - "Open neighborhood" (cloud AI processing, user consents to data use)
2. **BALANCED** - "Hybrid privacy" ($9.99/mo, selective cloud use)
3. **PARANOID** - "Gated community" ($29.99/mo, 100% local, encrypted storage)

**Features:**
- GDPR risk classification (automatic PII detection)
- User-controlled data routing (local vs cloud)
- Transparent consent (no hidden data collection)

**Radical Honesty Positioning:**
- FREE tier: "You're the product, and that's okay"
- Premium tiers: "Pay us, we never touch your data"

---

### Phase 3.4: Business Model Activation

**Objective:** Launch revenue streams

**Components:**
1. **FREE Tier Monetization**
   - Affiliate partnerships (therapy apps, mental health resources)
   - Sponsored content (ethically curated)
   - Anonymous aggregate analytics (user consented, GDPR compliant)

2. **Subscription Tiers**
   - BALANCED: $9.99/mo (hybrid privacy, selective cloud)
   - PARANOID: $29.99/mo (100% local + E2E encryption)
   - Annual discounts: BALANCED $99/year, PARANOID $299/year

3. **Distribution Channels**
   - Direct download (braindump.app)
   - Product Hunt launch (founder story: built while homeless during diagnosis)
   - App Store (iOS)
   - Google Play (Android)
   - Future: Enterprise licensing (team/organization features)

**Revenue Model Validation:**
- Beta testing with 100+ users
- Measure FREE → PAID conversion rates
- Track tier preferences (which do users actually choose?)
- Iterate pricing based on feedback
- Target: Break-even at 500 BALANCED or 200 PARANOID subscribers

---

## Migration Strategy

### From Phase C1 (Electron) to Phase 3.1 (Tauri)

**What We're Keeping:**
- Manager-based architecture pattern
- Test suite structure (adapt to Rust)
- Privacy profile logic
- Founder story positioning
- Business model framework
- Core design principles

**What We're Replacing:**
- Electron → Tauri
- Python (PyAudio) → Rust (cpal)
- Python (subprocess Whisper) → Rust (whisper-rs FFI)
- TypeScript managers → Rust modules
- HTML/CSS/JS → Svelte components
- Node.js backend → Pure Rust backend

**What We're Archiving (Not Deleting):**
- Phase C1 Electron code → `archive/electron-experiment` branch
- Tagged as `v0.1.0-electron-experiment`
- Documentation preserved for reference
- Test patterns documented for Rust port

---

## Version Numbering

**3.0.0 = Major Architecture Change**

- **3.x.x** = Tauri + Rust desktop era
- **4.x.x** = Future (if another major pivot happens)

**Milestone Structure:**
- Phase 3.1 = Desktop foundation (Tauri + Rust)
- Phase 3.2 = Mobile expansion (Flutter or Native)
- Phase 3.3 = Privacy profiles implementation
- Phase 3.4 = Business model activation

**Semantic Versioning:**
- 3.0.x = Bug fixes
- 3.x.0 = New features (backwards compatible)
- x.0.0 = Breaking changes

---

## Key Design Decisions

### 1. Rust Over Python
**Rationale:**
- Eliminates subprocess complexity
- Better memory safety (prevents crashes)
- Compiles to native code (no interpreter startup time)
- Cross-platform from single codebase
- Mobile-ready (can compile for iOS/Android via FFI)
- Better performance (10-100x faster for audio processing)

**Trade-offs Accepted:**
- Steeper learning curve
- Longer initial development time
- Smaller ecosystem than Python (but growing fast)

### 2. Tauri Over Electron
**Rationale:**
- 93% smaller bundle (10MB vs 140MB)
- Uses system WebView (no Chromium bundle needed)
- Native system API access
- Still uses web tech (Svelte) for UI
- Faster startup time (<1s vs 3-5s)
- Lower memory footprint (50MB vs 200MB)

**Trade-offs Accepted:**
- Younger ecosystem (but mature enough)
- Less documentation than Electron
- System WebView differences per platform (minor issue)

### 3. Svelte Over React
**Rationale:**
- Compiles to vanilla JS (no virtual DOM overhead)
- Smaller bundle size
- Easier to learn (less boilerplate)
- Better performance (no reconciliation needed)
- Clean, intuitive syntax
- PM preference (aligns with anti-React stance)

**Trade-offs Accepted:**
- Smaller community than React
- Fewer third-party components
- Less enterprise adoption (doesn't matter for us)

### 4. Mobile: Flutter or Native (Not React Native)
**Rationale:**
- PM doesn't like React (valid preference)
- Flutter = Dart (NOT React, Svelte-like declarative UI)
- Native = Jetpack Compose (Kotlin) + SwiftUI (Swift)
- Both options better than React Native for this use case
- PM wants Swift experience eventually (aligns with native iOS path)

**Recommended: Start Flutter, Then Native iOS**
- Faster to market (single codebase)
- Validate product-market fit
- Then invest in premium native iOS experience
- Keep Android on Flutter (or port to Jetpack Compose)

### 5. Gradual Rollout (Desktop First, Mobile Later)
**Rationale:**
- Validate core product on desktop first
- Prove Rust engine works in production
- Get paying customers before mobile investment
- Desktop market bigger for this use case (serious recording sessions)
- Mobile can wait until we have revenue

**Trade-offs Accepted:**
- Later entry to mobile market
- Competitors might launch mobile first
- Risk: Mobile users might want it sooner

---

## Non-Goals (What We're NOT Doing)

- ❌ Swift native Mac app (yet - maybe Phase 4.0)
- ❌ Web app version (desktop + mobile native only)
- ❌ Windows 7 support (Windows 10+ only)
- ❌ 32-bit builds (64-bit only, modern hardware)
- ❌ Chrome extension
- ❌ Browser-based version
- ❌ Linux ARM support initially (x86_64 only)
- ❌ Cloud sync (all local, user exports manually)

**Focus:** Desktop + Mobile native apps, nothing else. No web, no extensions, no legacy OS support.

---

## Success Criteria (Version 3.0)

### Phase 3.1 Complete When:
- [ ] Works on macOS (Intel + Apple Silicon)
- [ ] Works on Windows 10+ (x86_64)
- [ ] Works on Linux (Ubuntu 20.04+, x86_64)
- [ ] <10MB bundle size per platform
- [ ] <50MB memory usage during recording
- [ ] Recording → transcription pipeline functional
- [ ] Privacy profile selection working (implementation in 3.3)
- [ ] Installable packages (DMG, MSI, AppImage/Flatpak)

### Phase 3.2 Complete When:
- [ ] iOS app submitted to App Store (approved)
- [ ] Android app submitted to Google Play (approved)
- [ ] Feature parity with desktop version
- [ ] On-device Whisper processing working (Metal/GPU)
- [ ] <30MB app size (Flutter) or <20MB (Native)
- [ ] Works offline (no internet required)
- [ ] Privacy profiles functional on mobile

### Phase 3.3 Complete When:
- [ ] Three privacy tiers selectable in UI
- [ ] GDPR risk classification working (auto-detect PII)
- [ ] Data routing respects user choice (local vs cloud)
- [ ] E2E encryption working for PARANOID tier
- [ ] Clear consent UI for FREE tier ("you're the product")
- [ ] Privacy policy legally reviewed

### Phase 3.4 Complete When:
- [ ] Payment processing integrated (Stripe)
- [ ] Subscriptions active (monthly + annual)
- [ ] 100+ paying customers (validation milestone)
- [ ] Revenue > €1,000/month (sustainability threshold)
- [ ] Churn rate <10% monthly
- [ ] FREE → PAID conversion rate measured

---

## Risk Assessment

### Technical Risks

**Risk:** Whisper C++ integration in Rust harder than expected  
**Impact:** HIGH - Core functionality  
**Mitigation:** Keep Python subprocess as fallback during Phase 3.1, port incrementally

**Risk:** Cross-platform audio capture (cpal) has platform-specific bugs  
**Impact:** MEDIUM - Affects specific platforms  
**Mitigation:** Test on all three platforms early, file upstream bugs, contribute fixes

**Risk:** Flutter or Native FFI complexity on mobile  
**Impact:** MEDIUM - Delays Phase 3.2  
**Mitigation:** Prove Rust core on desktop first (Phase 3.1), validate FFI patterns before mobile

**Risk:** Metal GPU acceleration for Whisper on iOS  
**Impact:** MEDIUM - Performance impact  
**Mitigation:** Test early on real devices, optimize models, consider cloud fallback for older devices

### Business Risks

**Risk:** Users don't understand FREE tier "you're the product" honesty  
**Impact:** MEDIUM - Brand perception  
**Mitigation:** Beta test messaging with 50+ users, iterate based on feedback, A/B test copy

**Risk:** PARANOID tier ($29.99/mo) too expensive  
**Impact:** MEDIUM - Revenue target  
**Mitigation:** Offer annual discount ($299/year = $24.92/mo), add enterprise features to justify price

**Risk:** Mobile app store rejection (privacy concerns, mental health category)  
**Impact:** HIGH - Blocks Phase 3.2  
**Mitigation:** Clear privacy policies, full transparency, on-device processing, mental health disclaimers

**Risk:** Competitor launches similar product first  
**Impact:** LOW - Founder story differentiates  
**Mitigation:** Speed to market (Flutter MVP), emphasize unique positioning, focus on quality

### Funding Risks

**Risk:** NTDC grant application rejected  
**Impact:** MEDIUM - Slows development  
**Mitigation:** Bootstrap with savings, launch FREE tier for traction, apply with revenue proof

**Risk:** Development takes longer than 2 years (income support period)  
**Impact:** MEDIUM - Financial pressure  
**Mitigation:** Launch Phase 3.1 in 6 months, get paying customers by month 9, validate model by year 1

---

## Open Questions

1. **Rust Core Scope:** How much Python logic do we port vs keep as subprocess during transition?
   - **Recommendation:** Port audio capture first, keep Whisper subprocess initially

2. **Mobile Timeline:** Do we commit to Phase 3.2 or wait for desktop traction?
   - **Recommendation:** Wait for 500+ desktop users or €5K MRR before mobile

3. **Enterprise Features:** Should Phase 3.4 include team sharing/admin controls?
   - **Recommendation:** Only if 5+ enterprise customers request it (don't build speculatively)

4. **Swift Native:** Do we eventually build Swift version for iOS (Phase 4) or stick with Flutter?
   - **Recommendation:** Decide after Phase 3.2 launch, based on iOS user feedback

5. **Mobile Tech Choice:** Flutter (faster) or Native (better performance)?
   - **Recommendation:** Flutter for MVP (Phase 3.2), consider Native iOS in Phase 4.0

---

## Dependencies

### External Dependencies
- Rust toolchain (rustc 1.70+, cargo)
- Tauri CLI v2.0+
- Whisper C++ library (latest stable)
- Node.js 18+ (for Svelte build tooling)
- Platform-specific:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools
  - Linux: GCC/Clang, pkg-config

### Internal Dependencies
- Phase C1 codebase (reference for logic porting)
- Test suite (adapt patterns to Rust)
- Documentation (update for Tauri architecture)
- Design assets (icons, branding)

### NTDC Funding (Ireland Back-to-Work Enterprise Scheme)
- €2,000 equipment grant (laptop, recording equipment, dev tools)
- 2 years income support (eligibility confirmed)
- Potential €200,000 development grant (after revenue validation)
- Timeline: Apply for grant in 6-9 months with working prototype + revenue data

---

## Documentation Updates Required

### New Documentation
- `MIGRATION_GUIDE.md` - Electron → Tauri migration path
- `RUST_SETUP.md` - Development environment setup
- `CROSS_PLATFORM_BUILD.md` - Building for Windows/Mac/Linux
- `MOBILE_ARCHITECTURE.md` - Phase 3.2 mobile strategy
- `PRIVACY_TIERS.md` - Detailed privacy tier specifications

### Updated Documentation
- `README.md` - Reflect Tauri + Rust stack
- `ARCHITECTURE.md` - v3.0 system diagrams
- `CONTRIBUTING.md` - Rust conventions and style guide
- `DEPLOYMENT.md` - New build and release process

### Deprecated Documentation
- Electron-specific guides (move to `archive/docs/electron/`)
- Python environment setup (keep for reference during transition)
- Node.js backend docs (replaced by Rust backend)

---

## Communication Strategy

### Internal (Development Team = IamCodio + Claude Code)
- **Step-pause-step approach** - Avoid token burn, measure progress
- **Phase-by-phase planning** - Don't jump ahead, complete each phase fully
- **Measured progress** - Japanese meal philosophy, not American buffet

### External (Beta Users, Future Customers)
- **Transparent about pivot** - Blog post: "Why We Rewrote BrainDump in Rust"
- **Founder story emphasis** - Built while homeless during autism diagnosis
- **Radical honesty positioning** - Privacy tiers explained upfront, no BS marketing

### Funding Bodies (NTDC, Enterprise Ireland)
- **Working prototype demonstration** - Phase 3.1 complete before application
- **6 months development data** - Show progress from diagnosis → launch
- **Clear business model** - Revenue validation before grant request
- **Market research** - Show demand, competitor analysis, unique positioning

---

## Appendix: Version History

### v0.1.0-electron-experiment (Phase C1)
- **Architecture:** Electron + Python + TypeScript
- **Bundle Size:** 140MB
- **Test Coverage:** 92%
- **Privacy Profiles:** Designed (not implemented)
- **Status:** Archived (successful experiment, strategic pivot necessary)
- **Key Learnings:** Electron too heavy, Python subprocess fragile, but architecture patterns solid

### v3.0.0 (Phase 3.1 - Current)
- **Architecture:** Tauri + Rust + Svelte
- **Target Bundle Size:** <10MB
- **Platforms:** Windows, Mac, Linux (x86_64)
- **Status:** In Development
- **Goal:** Desktop foundation with cross-platform support

### v3.1.0 (Phase 3.2 - Planned)
- **Architecture:** Flutter (Dart) + Rust core OR Native (SwiftUI + Jetpack Compose) + Rust
- **Platforms:** iOS + Android
- **Status:** Future (after Phase 3.1 complete)
- **Goal:** Mobile expansion with feature parity

### v3.2.0 (Phase 3.3 - Planned)
- **Feature:** Privacy Profiles implementation
- **Tiers:** FREE, BALANCED ($9.99/mo), PARANOID ($29.99/mo)
- **Status:** Future (after Phase 3.2 complete)
- **Goal:** Monetization-ready with clear privacy options

### v3.3.0 (Phase 3.4 - Planned)
- **Feature:** Business Model activation
- **Revenue Streams:** Subscriptions, affiliates, ethical ads (FREE tier)
- **Status:** Future (after Phase 3.3 complete)
- **Goal:** Sustainable revenue, break-even or profitable

### v4.x.x (Potential Future)
- **Possible Features:** Swift native iOS, Enterprise team features, Cloud sync (optional)
- **Status:** Speculative (depends on Phase 3.x success)

---

## Next Steps (Immediate Actions)

### 1. Close Phase C1 (Complete)
- [x] Tag Electron codebase as `v0.1.0-electron-experiment`
- [ ] Move to `archive/electron-experiment` branch
- [ ] Document learnings in `LESSONS_LEARNED.md`
- [ ] Close all C1 GitHub issues with summary

### 2. Set Up Phase 3.1 Environment
- [ ] Create Phase 3.1 GitHub milestone
- [ ] Set up Rust project structure (`cargo init`)
- [ ] Install Tauri CLI and dependencies
- [ ] Set up Svelte frontend boilerplate
- [ ] Configure build pipeline for all three platforms

### 3. Begin Rust Core Development
- [ ] Port audio capture logic (Python → Rust cpal)
- [ ] Integrate Whisper C++ bindings
- [ ] Create file management module
- [ ] Write unit tests (aim for 90%+ coverage)

### 4. Documentation
- [ ] Update README with Tauri stack info
- [ ] Create RUST_SETUP.md for contributors
- [ ] Document architecture decisions

**No timescales assigned - PM (IamCodio) controls sprint scheduling**

---

## Conclusion

Version 3.0 represents a strategic pivot from Electron to Tauri + Rust, driven by:
- **Performance requirements** (10MB bundle vs 140MB)
- **Mobile expansion readiness** (Rust core reusable on iOS/Android)
- **Long-term sustainability** (lower memory, faster startup)

The core mission remains unchanged: **a black box recorder for people experiencing extreme trauma and loneliness.**

This pivot keeps what worked (architecture patterns, privacy profiles, business model) while replacing what didn't (Electron bloat, Python subprocess complexity).

**Success = Phase 3.1 complete, 500+ desktop users, €5K MRR before mobile investment.**

---

**Document Control**  
**Created:** 2025-11-05  
**Author:** Claude Sonnet 4.5 (Technical Lead) + IamCodio (Product Manager)  
**Status:** Active (Living Document)  
**Next Review:** After Phase 3.1 completion  
**Version Control:** Tracked in `/docs/strategic-pivot-v3.md`
