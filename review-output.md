# Requirements Review Findings

1. **Missing OS/version contract (Completeness, High)**  
   AlarmKit is “newer-iOS dependent,” but no minimum iOS version or support matrix is defined.  
   **Action:** Add explicit targets (e.g., min iOS for app, min iOS for AlarmKit mode) and behavior when AlarmKit is unavailable.

2. **Reliability is not measurable yet (Clarity, High)**  
   “Reliably” and “intended times” are underspecified. There is no tolerance window or expected miss-rate for closed-app delivery.  
   **Action:** Add acceptance criteria like delivery window (e.g., ±60s), expected success rate, and test conditions.

3. **Permission and first-run flows are unspecified (Completeness, High)**  
   Notification/alarm permissions are central to V1 behavior but no requirement defines onboarding, denied-permission behavior, or recovery UX.  
   **Action:** Add requirements for permission request timing, denied-state UI, and re-enable guidance.

4. **Schedule semantics need edge-case rules (Completeness, Medium)**  
   No defined behavior for timezone travel, DST changes, reboot, app update, or manual clock changes.  
   **Action:** Add canonical scheduling rules for these cases to avoid inconsistent implementations.

5. **Several requirements are not testable as written (Clarity, Medium)**  
   R5, R10, R11, R13, and R15 use subjective wording (“leave room,” “clearly enough,” “as native as practical”).  
   **Action:** Convert each to observable checks (e.g., specific copy requirements, UI states shown, architecture constraints, or test assertions).

6. **Tech-stack constraint may conflict with delivery goals (Scope/Feasibility, Medium)**  
   R17 prescribes jotai + expo-sqlite, while dual delivery (esp. AlarmKit) may require native capabilities not captured here.  
   **Action:** Reframe as a constraint with explicit escape hatch: “use this unless blocked by delivery-mode feasibility.”

7. **Dogfooding output is undefined (Completeness, Medium)**  
   You require comparing modes, but not what data/evidence decides the long-term default.  
   **Action:** Add a V1 evaluation rubric (metrics + observation template + decision owner + decision date).

8. **Product vs implementation constraints are mixed (Scope hygiene, Low)**  
   R19–R20 are repo/bootstrap execution constraints rather than user-facing requirements.  
   **Action:** Move them to “Implementation Constraints” or planning inputs to keep requirements focused.
