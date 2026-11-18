import '@testing-library/jest-dom/vitest'

// jsdom does not implement scrolling APIs.
Element.prototype.scrollTo = function () {}
Element.prototype.scrollIntoView = function () {}
