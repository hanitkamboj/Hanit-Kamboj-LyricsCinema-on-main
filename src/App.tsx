import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import UploadStep from './components/UploadStep';
import PreviewScreen from './components/PreviewScreen';

const App: React.FC = () => {
  const { step } = useStore();

  // Prevent default drag-drop on document (files should only go to dropzones)
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (!(e.target as HTMLElement).closest('[data-dropzone]')) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'none';
      }
    };
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a18',
        overflowX: 'hidden',
      }}
    >
      <div
        key={step}
        style={{
          animation: 'fadeIn 0.35s ease',
          minHeight: '100vh',
        }}
      >
        {step === 'upload' && <UploadStep />}
        {(step === 'preview' || step === 'export') && <PreviewScreen />}
      </div>
    </div>
  );
};

export default App;
