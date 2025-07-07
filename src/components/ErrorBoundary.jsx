import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Une erreur s'est produite.</h2>
          <p>Veuillez réessayer ou contacter le support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;