# Contributing Guide

Thank you for considering contributing to the Semantic Content Analyzer! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of TypeScript, React, and Next.js
- Familiarity with Sitecore XM Cloud (helpful but not required)

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/marketplace-starter.git
cd marketplace-starter
```

2. **Install dependencies**

```bash
npm install
```

3. **Create a branch for your changes**

```bash
git checkout -b feature/your-feature-name
```

4. **Start the development server**

```bash
npm run dev
```

5. **Run tests to ensure everything works**

```bash
npm test
```

## Development Workflow

### Making Changes

1. **Write your code**: Follow the coding standards below
2. **Add tests**: Write unit tests for new functionality
3. **Test thoroughly**: Run all tests and manual testing
4. **Lint your code**: Ensure no linting errors
5. **Commit your changes**: Use conventional commit messages

### Testing Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint your code
npm run lint
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(classifier): add support for video content type

Add semantic classification for video fields including
YouTube embeds and media library references.

Closes #123
```

```
fix(search): resolve debounce timing issue

The search debounce was not properly cleaning up timers,
causing memory leaks. This fix ensures cleanup on unmount.
```

## Coding Standards

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- Define explicit types for function parameters and return values
- Avoid `any` type (use `unknown` if necessary)
- Use interfaces for object shapes
- Use type unions for literal types

**Good**:
```typescript
interface ComponentProps {
  id: string;
  name: string;
  onSelect: (id: string) => void;
}

function MyComponent({ id, name, onSelect }: ComponentProps): JSX.Element {
  return <div onClick={() => onSelect(id)}>{name}</div>;
}
```

**Bad**:
```typescript
function MyComponent(props: any) {
  return <div onClick={() => props.onSelect(props.id)}>{props.name}</div>;
}
```

### React

- Use functional components with hooks
- Memoize callbacks with `useCallback`
- Memoize expensive computations with `useMemo`
- Keep components small and focused
- Extract reusable logic into custom hooks

**Good**:
```typescript
export function SearchBox({ onSearch, placeholder }: SearchBoxProps) {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return <input value={value} onChange={handleChange} placeholder={placeholder} />;
}
```

### File Organization

- One component per file
- Co-locate tests with source files (in `__tests__` directory)
- Group related utilities in the same file
- Export types from `types/index.ts`
- Keep file names consistent with export names

**File Naming**:
- Components: `PascalCase.tsx` (e.g., `SearchBox.tsx`)
- Utilities: `camelCase.ts` (e.g., `semanticClassifier.ts`)
- Tests: `*.test.ts` or `*.test.tsx`
- Types: `index.ts` in `types/` directory

### Styling

- Use inline styles with TypeScript style objects
- Define styles in a `styles` constant at the bottom of the file
- Use consistent spacing, colors, and typography
- Ensure responsive design

**Example**:
```typescript
function MyComponent() {
  return <div style={styles.container}>Content</div>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
  },
};
```

### Testing

- Write tests for all new features
- Test edge cases and error conditions
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

**Example**:
```typescript
describe('classifyFieldName', () => {
  it('should classify heading field names', () => {
    // Arrange
    const fieldName = 'Title';

    // Act
    const result = classifyFieldName(fieldName);

    // Assert
    expect(result).toBe('Heading');
  });
});
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Lint your code**: `npm run lint`
3. **Update documentation**: If you changed APIs or added features
4. **Add tests**: For new functionality
5. **Update CHANGELOG**: Add an entry describing your changes

### Submitting a PR

1. **Push your branch**

```bash
git push origin feature/your-feature-name
```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template**:
   - Describe what changes you made
   - Reference any related issues
   - Add screenshots for UI changes
   - List any breaking changes

4. **Request review** from maintainers

5. **Address feedback** promptly and professionally

### PR Review Checklist

Your PR will be reviewed for:

- [ ] Code quality and style
- [ ] Test coverage
- [ ] Documentation updates
- [ ] No breaking changes (or properly documented)
- [ ] Passes all CI checks
- [ ] Follows architectural patterns
- [ ] Performance considerations

## Types of Contributions

### Bug Fixes

If you find a bug:

1. **Search existing issues** to see if it's already reported
2. **Open a new issue** if not found, with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
3. **Submit a PR** with the fix and tests

### New Features

Before implementing a new feature:

1. **Open an issue** to discuss the feature
2. **Get feedback** from maintainers
3. **Implement the feature** once approved
4. **Submit a PR** with tests and documentation

### Documentation

Documentation improvements are always welcome:

- Fix typos or unclear sections
- Add examples or use cases
- Improve API documentation
- Write tutorials or guides

### Tests

Help improve test coverage:

- Add tests for untested code
- Improve existing test quality
- Add integration or E2E tests

## Project-Specific Guidelines

### Adding Semantic Categories

To add a new semantic category:

1. **Update types** in `src/types/index.ts`:
   ```typescript
   export type SemanticCategory = 
     | 'Heading'
     | 'YourNewCategory'
     | ...
   ```

2. **Add patterns** in `src/utils/semanticClassifier.ts`:
   ```typescript
   const FIELD_PATTERNS: Record<SemanticCategory, RegExp[]> = {
     YourNewCategory: [
       /^(pattern1|pattern2)$/i,
     ],
     ...
   };
   ```

3. **Add UI elements** in `src/components/SemanticList.tsx`:
   ```typescript
   const CATEGORY_COLORS: Record<SemanticCategory, string> = {
     YourNewCategory: '#ff6b6b',
     ...
   };
   ```

4. **Write tests** in `src/utils/__tests__/semanticClassifier.test.ts`

5. **Update documentation** in README.md

### Adding New Components

To add a new UI component:

1. Create file in `src/components/YourComponent.tsx`
2. Export types and component
3. Add tests in `src/components/__tests__/YourComponent.test.tsx`
4. Document props and usage
5. Import and use in parent components

### Modifying GraphQL Queries

When changing GraphQL queries:

1. **Test with real API** (if possible)
2. **Handle errors gracefully**
3. **Update mock data** for development
4. **Document query changes**
5. **Update types** to match response shape

## Community

### Getting Help

- **Issues**: Open an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check README and ARCHITECTURE docs first

### Staying Updated

- **Watch the repository** for notifications
- **Read the CHANGELOG** for updates
- **Follow release notes** for breaking changes

## Recognition

Contributors will be recognized in:

- CHANGELOG for each release
- GitHub contributors list
- Special thanks in release notes

Thank you for contributing! 🎉
