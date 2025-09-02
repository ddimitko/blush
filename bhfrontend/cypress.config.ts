import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    env: {
      apiUrl: 'https://localhost:8443/api',
      testUser: {
        email: 'customer@example.com',
        password: 'password123'
      },
      testEmployee: {
        email: 'employee@example.com',
        password: 'password123'
      },
      testOwner: {
        email: 'owner@example.com',
        password: 'password123'
      }
    },

    setupNodeEvents(on, config) {
      // Database seeding task
      on('task', {
        'db:seed': () => {
          // This would connect to your test database and seed it
          console.log('Seeding test database...');
          return null;
        },
        
        'db:clean': () => {
          // Clean the test database
          console.log('Cleaning test database...');
          return null;
        },
        
        log(message) {
          console.log(message);
          return null;
        }
      });

      // Code coverage setup
      require('@cypress/code-coverage/task')(on, config);
      
      return config;
    },
  },

  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },

  // Global configuration
  retries: {
    runMode: 2,
    openMode: 0,
  },
  
  watchForFileChanges: false,
  chromeWebSecurity: false,
  
  // Folders
  downloadsFolder: 'cypress/downloads',
  fixturesFolder: 'cypress/fixtures',
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
});
