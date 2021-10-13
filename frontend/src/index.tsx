import React from 'react';
import ReactDom from 'react-dom';
import App from './components/App';

const root = (ReactDom as any).createRoot(document.getElementById('app'));
root.render(<App />);