# Your automation code

One folder per stack. Create each folder when you start its first story:

```
tests/
├── playwright-ts/     Playwright + TypeScript (UI + API)
├── selenium-java/     Selenium + Java + TestNG (+ RestAssured API)
├── python/            pytest + requests + Selenium/Playwright for Python
├── cypress/           Cypress (JavaScript/TypeScript)
├── robot/             Robot Framework (Browser / SeleniumLibrary + RequestsLibrary)
├── webdriverio/       WebdriverIO + Mocha (UI) and Jest + Supertest (API)
├── postman/           Postman collections + Newman
└── tosca/             Tosca workspace exports + screenshots
```

Requirements, business rules and the review workflow are in [../docs/TESTING-GUIDE.md](../docs/TESTING-GUIDE.md).
