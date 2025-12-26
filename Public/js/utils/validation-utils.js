// Site validation key utilities
// This file handles checking if the site is running with a valid key

// Retrieve the stored validation status
function getValidationStatus() {
    return localStorage.getItem('siteValidated') === 'true';
}

// Store validation status
function setValidationStatus(isValid) {
    localStorage.setItem('siteValidated', isValid.toString());
}

// Store validation key
function storeValidationKey(key) {
    localStorage.setItem('validationKey', key);
}

// Get stored validation key
function getStoredValidationKey() {
    return localStorage.getItem('validationKey');
}

// Fetch the validation key from the server
async function fetchValidationKey() {
    try {
        //console.log('Fetching validation key from server...');
        const response = await fetch('/validation-key.txt');
        if (response.ok) {
            const key = await response.text();
            //console.log('Validation key fetched successfully');
            return key;
        } else {
            console.error('Failed to fetch validation key:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error fetching validation key:', error);
        return null;
    }
}

// Validate the site key - automatically use the key from validation-key.txt
async function validateSiteKey() {
    try {
        //console.log('Starting auto validation process...');
        
        // First try to get the key directly from the endpoint
        const validationKey = await fetchValidationKey();
        
        if (!validationKey) {
            console.error('Could not fetch validation key from server');
            setValidationStatus(false);
            return false;
        }
        
        // Store the key for future use
        storeValidationKey(validationKey);
        
        // Set validation status to true since we have a valid key
        setValidationStatus(true);
        //console.log('Site validated successfully');
        return true;
        
    } catch (error) {
        console.error('Error during validation process:', error);
        setValidationStatus(false);
        return false;
    }
}

// Check for validation on page load
document.addEventListener('DOMContentLoaded', async () => {
    //console.log('Validation utils loaded, checking site validation...');
    
    // Check if we already have a validated status
    const isValidated = getValidationStatus();
    //console.log('Current validation status:', isValidated);
    
    if (!isValidated) {
        // Automatically validate without requiring user input
        const isValid = await validateSiteKey();
        if (isValid) {
            //console.log('Site automatically validated');
        } else {
            console.error('Site validation failed. Please contact administrator.');
            // Display a message to contact administrator
            showValidationErrorMessage();
        }
    }
});

// Show an error message if automatic validation fails
function showValidationErrorMessage() {
    //console.log('Showing validation error message');
    
    // Create a message banner
    const messageContainer = document.createElement('div');
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '10px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.backgroundColor = '#f8d7da';
    messageContainer.style.color = '#721c24';
    messageContainer.style.padding = '10px 20px';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    messageContainer.style.zIndex = '9999';
    messageContainer.style.textAlign = 'center';
    
    messageContainer.innerHTML = `
        <div>
            <strong>Error:</strong> Site validation failed. Please contact your system administrator.
        </div>
    `;
    
    document.body.appendChild(messageContainer);
    
    // Remove the message after 8 seconds
    setTimeout(() => {
        if (document.body.contains(messageContainer)) {
            document.body.removeChild(messageContainer);
        }
    }, 8000);
}

// Export functions for use in other files
window.ValidationUtils = {
    validateSiteKey,
    getValidationStatus,
    fetchValidationKey,
    getStoredValidationKey
}; 