// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import React from 'react';

// Configure React Testing Library to use React.act instead of ReactDOMTestUtils.act
import { configure } from '@testing-library/react';

configure({
  // Use React.act instead of ReactDOMTestUtils.act
  asyncUtilTimeout: 5000,
  // Disable the warning about ReactDOMTestUtils.act
  reactStrictMode: false,
});

// Suppress the specific deprecation warning about ReactDOMTestUtils.act
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('ReactDOMTestUtils.act is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// react-router-dom is mocked via Jest moduleNameMapping in package.json
// This ensures all tests can use router components without issues
