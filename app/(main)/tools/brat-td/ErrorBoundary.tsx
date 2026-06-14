"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[brat-td] ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
          <p className="text-6xl mb-4">😵</p>
          <h2 className="heading-section text-on-primary mb-2">Щось пішло не так</h2>
          <p className="text-on-primary-mute text-sm max-w-md">
            Оновіть сторінку, щоб спробувати знову.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost text-on-primary mt-6"
          >
            Оновити сторінку
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
