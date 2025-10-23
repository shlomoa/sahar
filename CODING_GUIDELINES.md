# Coding Best Practices

## Use Best-Known-Methods (BKM)

- Always prefer established patterns documented in the latest official  documentation, for example use @if and not *ngIf as it is deprecated, another example is the deprication of APP_INITIALIZER in favor of standalone providers with factory functions.

## Update

BKMs evolve continuously. When a better BKM is discovered, propose to use it.
When a significant version update (For example to @angular/material) is available review and consider making a change.

## Dry

- Avoid code duplication by creating reusable components, services, or utility functions.
- Follow the Single Responsibility Principle (SRP) to ensure each component or service has a clear purpose.
- Refactor common logic into shared services or helper functions to promote code reuse.
- Use Angular directives and pipes to encapsulate common behaviors and transformations.
- Leverage Angular's dependency injection to share instances of services across components.
- Regularly review the codebase to identify and eliminate redundant or duplicate code.

## Use exceptions

- Exceptions guard against misunderstandings and inclarity of data availability.
- Use exceptions to enforce assumptions about data presence and state.
- Avoid returning undefined or null where an exception would be more appropriate.
- Clearly document the conditions under which exceptions are thrown to aid debugging and maintenance.
- Use custom exception classes when it makes sense to provide more context about errors.
- Handle exceptions gracefully at higher levels in the application to ensure a robust user experience.

## Maintain type consistency

- functions return a single typed value, not union with undefined or null
- use exceptions to enforce presence of data
- avoid optional chaining when the value is expected to be present
- ensure that state-derived values are always in sync with the state shape
- use strict typing and interfaces to define data structures clearly
- leverage TypeScript's type system to catch potential issues at compile time
- avoid using null|any|undefined type; prefer specific types or generics

## minimize change

- limit a change to the minimal set of files and lines necessary to implement the feature or fix the bug
- avoid unrelated refactoring or formatting changes in the same commit or PR
- when proposing changes, provide a clear rationale for each modification to facilitate review and approval
- follow established coding patterns and conventions to reduce cognitive load for reviewers
- test thoroughly to ensure that minimal changes do not introduce regressions or unintended side effects
- document any deviations from established patterns to aid future maintenance and understanding of the codebase.
- when updating shared code, ensure that dependent modules are minimally affected and require minimal adjustments.
