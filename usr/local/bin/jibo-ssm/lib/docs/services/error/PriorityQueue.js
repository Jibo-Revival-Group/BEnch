    /**
     * get the onItemAdded callback method
     * @return {Function} the callback method which supplies the list of added items as a parameter
     */

    /**
     * set the onItemAdded callback method
     * @param value {Function} the callback method which supplies the list of added items as a parameter
     */

    /**
     * get the onItemRemoved callback method
     * @return {Function} the callback method which supplies the list of removed items as a parameter
     */

    /**
     * set the onItemRemoved callback method
     * @param value {Function} the callback method which supplies the list of removed items as a parameter
     */

    /**
     * Add an item to add to the priority queue. This will be compared and sorted according to the
     * compare method.
     *
     * @param element {Array<T>} an array of items to add to the priority queue
     * @return {boolean} true if any of the items were successfully added / false otherwise
     */

    /**
     * @param element {T} the item to add to the priority queue
     * @return {boolean} true if the item was successfully added / false otherwise
     */

    /**
     * Delete an item from the priority queue
     *
     * @param element {Array<T>} the items to delete
     * @return {boolean} true if any of the items were successfully deleted / false otherwise
     */

    /**
     * @param element {T} the item to delete
     * @return {boolean} true if the item was successfully deleted / false otherwise
     */

    /**
     * Get the highest priority item from the priority queue
     * @return {T} The highest priority item. null if there are no items in the priority queue
     */

     /**
      * Get and remove the highest priority item from the priority queue
      * @return {T} The highest priority item. null if there are no items in the priority queue
      */

     /**
      * Search to see if the priority queue contains a given item
      * @param element {T} the item to search for
      * @return {boolean} True if the element exists in the priority queue. false otherwise
      */

    /**
     * Return the element at the underlying array index. null if index out of bounds
     * @param index {number} the index of the item to return
     * @return {T} the element found at the index paramter. null if index out of bounds
     */

    /**
     * Get the current number of elements in the priority queue
     * @return {number} The current number of elements in the priority queue
     */

    /**
     * Remove all elements from the priority queue
     */

    /**
     * The actual implementation of adding an element to separate the method overloading logic from the priority queue insertion logic
     * @param element {T} the item to add to the priority queue
     * @return {boolean} true if the item was successfully added / false otherwise
     */

    /**
     * The actual implementation of deleting an element to separate the method overloading logic from the priority queue insertion logic
     * @param element {T} the item to delete
     * @return {boolean} true if the item was successfully deleted / false otherwise
     */

    /**
     * Try to find the index in the priority queue for a given element.
     * @param element {T} the element to lookup
     * @returns {number} The index of the element or -1 if the element is not found
     */