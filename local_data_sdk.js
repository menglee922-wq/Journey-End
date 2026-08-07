/**
 * Local Data SDK - replaces Canva Data SDK
 * Simulates the same interface but uses local backend API
 */
(function() {
  'use strict';

  class LocalDataSdk {
    constructor() {
      this.apiBase = '/api/data';
      this.dataHandler = null;
      this.allData = [];
      this.pollInterval = null;
      this.pollRate = 2000; // 2 seconds
      this.initialized = false;
    }

    /**
     * Initialize the SDK with a data handler
     * @param {Object} handler - Data handler with onDataChanged callback
     */
    async init(handler) {
      this.dataHandler = handler;
      
      // Initial data load
      await this.loadData();
      
      // Start polling for changes
      this.startPolling();
      
      this.initialized = true;
      return { isOk: true };
    }

    /**
     * Load all data from backend
     */
    async loadData() {
      try {
        const response = await fetch(this.apiBase);
        const result = await response.json();
        
        if (result.success && result.data) {
          this.allData = result.data;
          this.notifyDataChanged();
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }

    /**
     * Notify handler that data has changed
     */
    notifyDataChanged() {
      if (this.dataHandler && typeof this.dataHandler.onDataChanged === 'function') {
        // Create a copy to avoid mutation issues
        this.dataHandler.onDataChanged([...this.allData]);
      }
    }

    /**
     * Start polling for data changes
     */
    startPolling() {
      if (this.pollInterval) return;
      
      this.pollInterval = setInterval(() => {
        this.loadData();
      }, this.pollRate);
    }

    /**
     * Stop polling
     */
    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }

    /**
     * Create a new record
     * @param {Object} record - Record data to create
     * @returns {Object} Result with isOk flag
     */
    async create(record) {
      try {
        const response = await fetch(this.apiBase, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update local data
          await this.loadData();
          return { isOk: true, record: result.record };
        } else {
          return { isOk: false, error: result.error };
        }
      } catch (err) {
        console.error('Error creating record:', err);
        return { isOk: false, error: err.message };
      }
    }

    /**
     * Update an existing record
     * @param {Object} record - Record data with __backendId
     * @returns {Object} Result with isOk flag
     */
    async update(record) {
      try {
        if (!record.__backendId) {
          console.error('Update failed: no __backendId');
          return { isOk: false, error: 'Missing __backendId' };
        }
        
        const id = record.__backendId;
        const response = await fetch(`${this.apiBase}/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update local data
          await this.loadData();
          return { isOk: true, record: result.record };
        } else {
          return { isOk: false, error: result.error };
        }
      } catch (err) {
        console.error('Error updating record:', err);
        return { isOk: false, error: err.message };
      }
    }

    /**
     * Delete a record
     * @param {Object} record - Record with __backendId
     * @returns {Object} Result with isOk flag
     */
    async delete(record) {
      try {
        if (!record.__backendId) {
          return { isOk: false, error: 'Missing __backendId' };
        }
        
        const id = record.__backendId;
        const response = await fetch(`${this.apiBase}/${id}`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
          await this.loadData();
          return { isOk: true };
        } else {
          return { isOk: false, error: result.error };
        }
      } catch (err) {
        console.error('Error deleting record:', err);
        return { isOk: false, error: err.message };
      }
    }

    /**
     * Get all current data
     * @returns {Array} All records
     */
    getAll() {
      return [...this.allData];
    }
  }

  // Export to window
  window.dataSdk = new LocalDataSdk();
  
  console.log('%c Local Data SDK loaded ', 'background: #222; color: #bada55');
})();
