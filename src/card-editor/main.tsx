import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Editor from './Editor.tsx';
import '../styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><Editor/></StrictMode>);
