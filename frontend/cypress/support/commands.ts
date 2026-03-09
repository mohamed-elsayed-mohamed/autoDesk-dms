/// <reference types="cypress" />

// Custom command to log in via the API and store the token
Cypress.Commands.add('loginAs', (role: 'SalesConsultant' | 'SalesManager' | 'FniManager' | 'GeneralManager') => {
  const credentials: Record<string, { email: string; password: string }> = {
    SalesConsultant: { email: 'sales@autodesk-dms.com', password: 'password' },
    SalesManager: { email: 'manager@autodesk-dms.com', password: 'password' },
    FniManager: { email: 'fni@autodesk-dms.com', password: 'password' },
    GeneralManager: { email: 'gm@autodesk-dms.com', password: 'password' },
  };

  const creds = credentials[role];
  cy.request('POST', `${Cypress.env('apiUrl') || 'http://localhost:3000'}/api/auth/login`, creds).then((res) => {
    const { accessToken, user } = res.body;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(role: 'SalesConsultant' | 'SalesManager' | 'FniManager' | 'GeneralManager'): Chainable<void>;
    }
  }
}

export {};
