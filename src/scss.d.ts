// Side-effect SCSS imports in client components. They carry no runtime value
// for TypeScript; this ambient declaration lets `tsc` emit declarations.
declare module '*.scss'
declare module '*.css'
