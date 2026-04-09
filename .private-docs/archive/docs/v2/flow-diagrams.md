# Flow Diagrams: NIP-XX (Prepared Migration) & NIP-XY (Social Transition)

---

## 1. NIP-XX: Prepared Migration — Happy Path

The simplest scenario: user enrolls, time passes, migration is needed.

```mermaid
sequenceDiagram
    participant O as Old Key (O)
    participant R as Relay
    participant OTS as OpenTimestamps / Bitcoin
    participant M as Migration Key (M)
    participant N as Successor Key (N)
    participant C as Client

    Note over O,N: Phase 1: Enrollment (calm times)
    O->>R: Publish kind:1776 PMA<br/>tags: [o, O] [m, M]
    R-->>OTS: PMA event id submitted for timestamping
    OTS-->>R: kind:1040 proof published<br/>(anchored at Bitcoin block height H)

    Note over O,N: ⏳ Time passes... key is lost or compromised

    Note over O,N: Phase 2: Execution (crisis time)
    N->>M: (out-of-band) "I'm the new key, sign my consent"
    M->>M: Build PMX, get N's detached consent signature
    N-->>M: ns signature over PMX preimage
    M->>R: Publish kind:1777 PMX<br/>tags: [o, O] [n, N] [e, PMA_id] [ns, sig]

    Note over O,N: Phase 3: Client Resolution
    C->>R: Query kind:1776 for O
    R-->>C: PMA event
    C->>R: Query kind:1040 for PMA
    R-->>C: OTS proof (anchor_height = H)
    C->>R: Query kind:1777 referencing PMA
    R-->>C: PMX event
    C->>C: Validate PMA → Validate PMX<br/>→ State: prepared_migrated<br/>→ Successor = N
    C->>C: Show user: "O migrated to N<br/>(prepared migration, anchored at block H)"
```

---

## 2. NIP-XX: Authority Update Chain

User rotates the migration key before needing to execute.

```mermaid
sequenceDiagram
    participant O as Old Key (O)
    participant M1 as Migration Key 1 (M₁)
    participant M2 as Migration Key 2 (M₂)
    participant OTS as OpenTimestamps
    participant R as Relay

    Note over O,M2: Initial enrollment
    O->>R: kind:1776 PMA → m = M₁
    R-->>OTS: timestamp PMA
    OTS-->>R: kind:1040 proof (block H₁)

    Note over O,M2: Authority update (M₁ → M₂)
    M1->>M1: Build PMU event<br/>Collect detached sigs from O and M₂
    O-->>M1: os signature (O signs preimage)
    M2-->>M1: ns signature (M₂ signs preimage)
    M1->>R: kind:1779 PMU<br/>tags: [o, O] [e, PMA_id] [u, M₂] [os, sig] [ns, sig]
    R-->>OTS: timestamp PMU
    OTS-->>R: kind:1040 proof (block H₂)

    Note over O,M2: Later: execution uses M₂, not M₁
    M2->>R: kind:1777 PMX<br/>tags: [e, PMU_id] (references PMU, not PMA)
```

---

## 3. NIP-XX: Authority Resolution State Machine

```mermaid
stateDiagram-v2
    [*] --> none: No valid PMA<br/>for pubkey O

    none --> FindRoots: Valid PMA(s) found

    FindRoots --> conflicting_roots: 2+ PMAs share<br/>min anchor_height

    FindRoots --> WalkChain: Exactly 1 PMA<br/>at min anchor_height

    WalkChain --> conflicting_authority_updates: 2+ PMUs reference<br/>same parent

    WalkChain --> ResolveExecution: Chain ends<br/>(0 children)

    ResolveExecution --> prepared_enrolled: 0 valid PMX events<br/>for active authority

    ResolveExecution --> prepared_migrated: All valid PMX events<br/>point to same N

    ResolveExecution --> conflicting_executions: PMX events point<br/>to different N values

    state FindRoots {
        [*] --> ComputeAnchorHeights
        ComputeAnchorHeights --> SelectMinHeight
    }

    state WalkChain {
        [*] --> CurrentAuthority
        CurrentAuthority --> FindChildren: Query PMUs<br/>referencing current
        FindChildren --> CurrentAuthority: Exactly 1 child<br/>(advance)
        FindChildren --> ChainEnd: 0 children
    }
```

---

## 4. NIP-XX: All Terminal States

```mermaid
flowchart TB
    subgraph terminal["Terminal States"]
        none["🔵 none<br/>No PMA exists for O"]
        cr["🔴 conflicting_roots<br/>2+ PMAs at same min block height"]
        pe["🟢 prepared_enrolled<br/>Authority chain valid, no execution yet"]
        cau["🔴 conflicting_authority_updates<br/>PMU chain forks"]
        pm["🟢 prepared_migrated<br/>Valid execution → successor N"]
        ce["🔴 conflicting_executions<br/>PMX events name different successors"]
    end

    subgraph meaning["What Clients Do"]
        none_a["Nothing to show"]
        cr_a["⚠️ Show conflict warning<br/>Do NOT pick a winner"]
        pe_a["ℹ️ Show 'prepared migration enrolled'<br/>Migration key M is standing by"]
        cau_a["⚠️ Show conflict warning<br/>Authority chain is ambiguous"]
        pm_a["✅ Show migration result<br/>Offer: follow N / follow both / inspect"]
        ce_a["⚠️ Show conflict warning<br/>Multiple successor claims"]
    end

    none --- none_a
    cr --- cr_a
    pe --- pe_a
    cau --- cau_a
    pm --- pm_a
    ce --- ce_a
```

---

## 5. NIP-XY: Social Transition — Claim & Attestation Flow

```mermaid
sequenceDiagram
    participant O as Old Key (O)
    participant N as New Key (N)
    participant R as Relay
    participant A1 as Friend Alice
    participant A2 as Friend Bob
    participant V as Viewer (Client)

    Note over O,V: Phase 1: Claims
    N->>R: kind:1778 STC<br/>r = "new"<br/>"I'm O's new key"
    O->>R: kind:1778 STC<br/>r = "old"<br/>"I moved to N"

    Note over O,V: Phase 2: Attestations
    A1->>R: kind:31778 STA<br/>s = "support", m = "in_person"<br/>"I verified this in person"
    A2->>R: kind:31778 STA<br/>s = "support", m = "voice"<br/>"Confirmed over phone"

    Note over O,V: Phase 3: Viewer Resolution
    V->>R: Query kind:1778 + kind:31778<br/>for transition T(O,N)
    R-->>V: Claims + Attestations
    V->>V: Compute T = SHA256(prefix ‖ O ‖ N)
    V->>V: Filter attestations by<br/>viewer's follow set
    V->>V: Alice followed? ✅ support<br/>Bob followed? ✅ support
    V->>V: State: socially_supported
    V->>V: Show: "O → N<br/>Supported by 2 people you follow"
```

---

## 6. NIP-XY: Social State Resolution (Viewer-Relative)

```mermaid
flowchart TD
    Start["Query claims for transition T(O,N)"] --> HasClaims{Any valid<br/>STC exists?}

    HasClaims -->|No| none["🔵 none<br/>No transition claim"]

    HasClaims -->|Yes| GetAttestations["Get latest STA per attestor<br/>for transition T"]

    GetAttestations --> FilterFollows["Filter by viewer's follow set"]

    FilterFollows --> CheckSupport{Any followed<br/>attestor says<br/>'support'?}

    CheckSupport -->|No| CheckOppose{Any followed<br/>attestor says<br/>'oppose'?}

    CheckOppose -->|No| claimed["🟡 claimed<br/>Claim exists but no followed<br/>attestors have weighed in"]

    CheckOppose -->|Yes| opposed["🟠 socially_opposed<br/>Followed contacts oppose,<br/>none support"]

    CheckSupport -->|Yes| CheckBothSides{Any followed<br/>attestor says<br/>'oppose'?}

    CheckBothSides -->|No| supported["🟢 socially_supported<br/>Followed contacts support it"]

    CheckBothSides -->|Yes| split["🔴 socially_split<br/>Followed contacts disagree"]
```

---

## 7. NIP-XY: Attestation Lifecycle (Mutable Stance)

```mermaid
sequenceDiagram
    participant A as Attestor (Alice)
    participant R as Relay
    participant V as Viewer

    Note over A,V: Alice initially supports the transition
    A->>R: kind:31778 STA #1<br/>d = T, s = "support"<br/>created_at = t₁

    V->>R: Query (31778, Alice, T)
    R-->>V: STA #1 → support

    Note over A,V: Alice changes her mind
    A->>R: kind:31778 STA #2<br/>d = T, s = "oppose"<br/>created_at = t₂ (t₂ > t₁)

    V->>R: Query (31778, Alice, T)
    R-->>V: STA #2 → oppose
    Note over V: STA #1 is superseded<br/>(addressable: latest wins)

    Note over A,V: Alice reconsiders again
    A->>R: kind:31778 STA #3<br/>d = T, s = "uncertain"<br/>created_at = t₃ (t₃ > t₂)

    V->>R: Query (31778, Alice, T)
    R-->>V: STA #3 → uncertain
    Note over V: Only the latest STA counts<br/>History may be lost (intentional tradeoff)
```

---

## 8. Combined View: Both NIPs Together

How a client composes results from both protocols side by side.

```mermaid
flowchart LR
    subgraph nipxx["NIP-XX: Prepared Migration"]
        direction TB
        XX_Start["Resolve authority chain"] --> XX_Result
        XX_Result{"Terminal state?"}
        XX_Result -->|prepared_migrated| XX_PM["✅ Cryptographic<br/>migration valid<br/>O → N"]
        XX_Result -->|prepared_enrolled| XX_PE["ℹ️ Enrolled but<br/>not yet executed"]
        XX_Result -->|none| XX_None["No prepared<br/>migration"]
        XX_Result -->|conflict| XX_Conflict["⚠️ Conflict<br/>detected"]
    end

    subgraph nipxy["NIP-XY: Social Transition"]
        direction TB
        XY_Start["Resolve social claims<br/>(viewer-relative)"] --> XY_Result
        XY_Result{"Social state?"}
        XY_Result -->|supported| XY_Sup["🟢 Socially<br/>supported"]
        XY_Result -->|opposed| XY_Opp["🟠 Socially<br/>opposed"]
        XY_Result -->|split| XY_Split["🔴 Socially<br/>split"]
        XY_Result -->|claimed| XY_Claim["🟡 Claimed<br/>only"]
        XY_Result -->|none| XY_None["No social<br/>claim"]
    end

    subgraph client["Client Presentation Layer"]
        direction TB
        C1["✅✅ Prepared + Supported<br/>Strongest signal"]
        C2["✅🟡 Prepared + Claimed only<br/>Crypto valid, social pending"]
        C3["✅🟠 Prepared + Opposed<br/>Show both, flag tension"]
        C4["ℹ️🟢 Enrolled + Supported<br/>Ready but not executed"]
        C5["—🟢 No prep + Supported<br/>Social-only migration"]
        C6["—🟡 No prep + Claimed<br/>Weakest signal, needs verification"]
        C7["⚠️🔴 Conflict + Split<br/>Show all evidence, no auto-action"]
    end

    XX_PM --> C1
    XX_PM --> C2
    XX_PM --> C3
    XX_PE --> C4
    XX_None --> C5
    XX_None --> C6
    XX_Conflict --> C7

    XY_Sup --> C1
    XY_Claim --> C2
    XY_Opp --> C3
    XY_Sup --> C4
    XY_Sup --> C5
    XY_Claim --> C6
    XY_Split --> C7
```

---

## 9. Scenario: Unprepared User (Social-Only Migration)

User lost their key but never enrolled in Prepared Migration.

```mermaid
sequenceDiagram
    participant O as Old Key (O)<br/>🔒 LOST
    participant N as New Key (N)
    participant R as Relay
    participant F1 as Friend 1
    participant F2 as Friend 2
    participant V as Viewer

    Note over O,V: O is lost — user creates N from scratch

    N->>R: kind:1778 STC<br/>r = "new", content: "Lost my old key"

    Note over O,V: O cannot publish (key is lost)<br/>Only N-side claim exists

    Note over O,V: Friends verify out-of-band
    F1->>R: kind:31778 STA<br/>s = "support", m = "video"
    F2->>R: kind:31778 STA<br/>s = "support", m = "in_person"

    Note over O,V: Client resolution
    V->>V: NIP-XX: none (no PMA exists)
    V->>V: NIP-XY: socially_supported<br/>(2 followed supporters)
    V->>V: Combined: Social-only migration<br/>No cryptographic proof
    V->>V: UI: "N claims to be O's successor<br/>2 people you follow confirmed<br/>⚠️ No prepared migration exists"
```

---

## 10. Scenario: Key Compromise Race

Attacker compromises O and tries to create a fake migration, but user had enrolled PMA.

```mermaid
sequenceDiagram
    participant U as User (has M)
    participant A as Attacker (has O)
    participant R as Relay
    participant OTS as OpenTimestamps
    participant C as Client

    Note over U,C: Previously: User enrolled PMA at block H₁<br/>M is safe, O is compromised

    Note over U,C: Attacker tries social attack
    A->>R: kind:1778 STC (using O)<br/>r = "old", o = O, n = A_new<br/>"I moved to A_new"

    Note over U,C: Attacker tries to create competing PMA
    A->>R: kind:1776 PMA<br/>o = O, m = A_migration
    R-->>OTS: timestamp attacker's PMA
    OTS-->>R: proof at block H₂ (H₂ > H₁)

    Note over U,C: Legitimate user executes prepared migration
    U->>R: kind:1777 PMX<br/>Signed by M, references original PMA<br/>n = N (real successor)

    Note over U,C: Client resolves
    C->>C: NIP-XX: 2 PMAs found
    C->>C: User's PMA: anchor H₁<br/>Attacker's PMA: anchor H₂
    C->>C: H₁ < H₂ → User's PMA is canonical root
    C->>C: PMX valid under canonical authority
    C->>C: State: prepared_migrated → N ✅

    C->>C: NIP-XY: Attacker's STC exists for O→A_new
    C->>C: But NIP-XX result is independent<br/>Prepared migration wins on its own terms
    C->>C: UI shows both layers of evidence
```

---

## 11. Scenario: Disputed Transition (Social Split)

Community disagrees about a transition's legitimacy.

```mermaid
sequenceDiagram
    participant N as New Key (N)
    participant R as Relay
    participant F1 as Supporter
    participant F2 as Opposer
    participant V as Viewer

    N->>R: kind:1778 STC<br/>r = "new"

    F1->>R: kind:31778 STA<br/>s = "support", m = "voice"
    F2->>R: kind:31778 STA<br/>s = "oppose", content = "This doesn't match<br/>what I know about O"

    V->>V: Follow set includes F1 and F2
    V->>V: NIP-XY: socially_split
    V->>V: NIP-XX: none (no PMA)

    V->>V: UI: "⚠️ Disputed transition<br/>1 contact supports, 1 opposes<br/>No cryptographic migration exists<br/>[View evidence] [Follow N] [Ignore]"

    Note over V: Client MUST NOT auto-resolve<br/>User decides
```

---

## 12. Event Kind Reference

```mermaid
graph TB
    subgraph nipxx["NIP-XX: Prepared Migration"]
        PMA["kind:1776<br/><b>PMA</b><br/>Prepared Migration Authority<br/><i>Signed by O</i>"]
        PMU["kind:1779<br/><b>PMU</b><br/>Authority Update<br/><i>Signed by M_prev</i><br/><i>+ detached sigs from O & M_next</i>"]
        PMX["kind:1777<br/><b>PMX</b><br/>Migration Execution<br/><i>Signed by active M</i><br/><i>+ detached sig from N</i>"]
        OTS["kind:1040<br/><b>NIP-03</b><br/>OpenTimestamps Proof"]

        PMA -->|"e tag"| OTS
        PMU -->|"e tag"| PMA
        PMU -->|"e tag"| OTS
        PMX -->|"e tag"| PMA
        PMX -.->|"or e tag"| PMU
    end

    subgraph nipxy["NIP-XY: Social Transition"]
        STC["kind:1778<br/><b>STC</b><br/>Social Transition Claim<br/><i>Signed by O or N</i><br/><i>Immutable</i>"]
        STA["kind:31778<br/><b>STA</b><br/>Social Transition Attestation<br/><i>Signed by any attestor</i><br/><i>Addressable (latest wins)</i>"]

        STA -.->|"optional e tag"| STC
    end

    style PMA fill:#2d5a27,color:#fff
    style PMU fill:#4a3b0f,color:#fff
    style PMX fill:#1a3a5c,color:#fff
    style OTS fill:#5a2d2d,color:#fff
    style STC fill:#3b1a5c,color:#fff
    style STA fill:#1a4a4a,color:#fff
```

---

## 13. Decision Tree: What Should a Client Do?

```mermaid
flowchart TD
    Start["User views profile of O"] --> QueryXX["Query NIP-XX events<br/>for pubkey O"]
    QueryXX --> ResolveXX["Run authority resolution"]
    ResolveXX --> XXState{NIP-XX state?}

    XXState -->|prepared_migrated| HasSuccessor["N is known from PMX"]
    XXState -->|prepared_enrolled| Enrolled["Migration authority exists<br/>but no execution yet"]
    XXState -->|none| NoPrep["No prepared migration"]
    XXState -->|conflict| Conflict["Show conflict warning"]

    HasSuccessor --> QueryXY["Also query NIP-XY<br/>for T(O, N)"]
    NoPrep --> QueryXYBroad["Query NIP-XY claims<br/>involving O"]

    QueryXY --> XYState1{Social state?}
    XYState1 -->|supported| Best["✅ Strongest: crypto + social<br/>Suggest: follow N"]
    XYState1 -->|none/claimed| Good["✅ Crypto valid, social pending<br/>Suggest: follow N, note social gap"]
    XYState1 -->|opposed| Tension["⚠️ Crypto valid but socially opposed<br/>Show both, let user decide"]

    QueryXYBroad --> XYState2{Any claims?}
    XYState2 -->|Yes| SocialOnly["Social-only transition<br/>Show evidence + attestations"]
    XYState2 -->|No| Nothing["No migration info<br/>Normal profile"]

    Enrolled --> ShowEnrolled["ℹ️ Show enrollment badge<br/>'This identity has a<br/>prepared migration backup'"]

    Conflict --> ShowEvidence["⚠️ Show all evidence<br/>DO NOT auto-resolve"]
```
