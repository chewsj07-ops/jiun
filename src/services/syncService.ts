export const syncService = {
  async syncLogs(logs: any[]) {
    try {
      const response = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      });
      
      if (response.status === 201) {
        const result = await response.json();
        console.log(`Synced ${result.synced} records. Received ${result.server_updates.length} updates from server.`);
        return result;
      } else {
        console.error('Sync failed with status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Sync error:', error);
      return null;
    }
  }
}; 
