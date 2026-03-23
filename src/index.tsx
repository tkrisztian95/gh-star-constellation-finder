
import React, { useState, useEffect } from 'react';
import { render, Text, Box, Newline } from 'ink';

const App = () => {
  const [status, setStatus] = useState('Initializing Systems...');
  const [currentRepo, setCurrentRepo] = useState(null);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box justifyContent="space-between">
        <Text color="magenta" bold>✨ gh-star-constellation-finder</Text>
        <Text color="gray">v1.0.0</Text>
      </Box>
      
      <Box marginTop={1} marginBottom={1}>
        <Text backgroundColor="white" color="black"> STATUS </Text>
        <Text> {status}</Text>
      </Box>

      <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
        <Text bold color="yellow">Target: {currentRepo || "Scanning Horizon..."}</Text>
        <Newline />
        <Text italic color="blue">AI Insight: Waiting for scan...</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[Enter] Confirm   [S] Skip   [Q] Quit</Text>
      </Box>
    </Box>
  );
};

render(<App />);