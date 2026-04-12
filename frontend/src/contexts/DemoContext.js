import { createContext, useContext, useState } from 'react';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [demoActive, setDemoActive] = useState(false);

  return (
    <DemoContext.Provider value={{ demoActive, setDemoActive }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
