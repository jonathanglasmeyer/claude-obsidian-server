'use client';

import { useState } from 'react';

export default function Test() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>React Test: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}