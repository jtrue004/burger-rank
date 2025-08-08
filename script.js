// BurgerRank - Main Application Logic

class BurgerRank {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'loading';
        this.burgers = [];
        this.restaurants = [];
        this.ranks = [];
        this.users = [];
        this.currentLocation = '60614';
        this.searchRadius = 10;
        this.currentLeaderboardSection = 'top-ranked';
        this.currentRankingBurgerId = null;
        this.currentBurgerId = null;
        
        this.init();
    }

    init() {
        try {
            console.log('Initializing BurgerRank app...');
            this.loadData();
            this.setupEventListeners();
            this.showLoadingScreen();
            
            // Quick load - no delays
            setTimeout(() => {
                this.checkAuth();
            }, 500);
        } catch (error) {
            console.error('Error initializing app:', error);
            // If there's an error, try to show the auth screen anyway
            setTimeout(() => {
                this.showAuthScreen();
            }, 1000);
        }
        
        // Fallback timeout - if still loading after 5 seconds, force auth screen
        setTimeout(() => {
            if (this.currentScreen === 'loading') {
                console.log('Fallback: forcing auth screen due to timeout');
                this.showAuthScreen();
            }
        }, 5000);
    }

    // Data Management
    loadData() {
        const APP_VERSION = '1.0.0';
        const storedVersion = localStorage.getItem('appVersion');
        
        console.log('App version:', APP_VERSION);
        console.log('Stored version:', storedVersion);
        
        // Check if this is a new version or first run
        if (storedVersion !== APP_VERSION) {
            console.log('Version mismatch or first run - migrating data...');
            this.migrateData(storedVersion, APP_VERSION);
        }
        
        this.burgers = JSON.parse(localStorage.getItem('burgers')) || [];
        this.restaurants = JSON.parse(localStorage.getItem('restaurants')) || [];
        this.ranks = JSON.parse(localStorage.getItem('ranks')) || [];
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        
        console.log('Loaded data:', {
            burgers: this.burgers.length,
            restaurants: this.restaurants.length,
            ranks: this.ranks.length,
            users: this.users.length
        });
        
        // Load sample data if empty (only on first run)
        if (this.burgers.length === 0) {
            console.log('Loading sample data...');
            this.loadSampleData();
        }
        
        // Clean up any object URLs that won't persist
        this.convertObjectUrlsToBase64();
        
        // Update version
        localStorage.setItem('appVersion', APP_VERSION);
    }

    migrateData(oldVersion, newVersion) {
        console.log(`Migrating from version ${oldVersion} to ${newVersion}`);
        
        // If no previous version, this is first run - just load sample data
        if (!oldVersion) {
            console.log('First run - loading initial sample data');
            return;
        }
        
        // Load current data before clearing
        const currentBurgers = JSON.parse(localStorage.getItem('burgers')) || [];
        const currentRestaurants = JSON.parse(localStorage.getItem('restaurants')) || [];
        const currentRanks = JSON.parse(localStorage.getItem('ranks')) || [];
        const currentUsers = JSON.parse(localStorage.getItem('users')) || [];
        
        // CRITICAL: Preserve authentication data to prevent logout!
        const currentUser = localStorage.getItem('currentUser');
        const userEmail = localStorage.getItem('userEmail');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        // Preserve user-created data
        const userBurgers = currentBurgers.filter(burger => 
            !burger.id.startsWith('burger') // Sample burgers have IDs like 'burger1', 'burger2', etc.
        );
        const userRestaurants = currentRestaurants.filter(restaurant => 
            !restaurant.id.startsWith('rest') // Sample restaurants have IDs like 'rest1', 'rest2', etc.
        );
        const userRanks = currentRanks; // Keep all ranks
        const userUsers = currentUsers; // Keep all users
        
        console.log('Preserving user data:', {
            userBurgers: userBurgers.length,
            userRestaurants: userRestaurants.length,
            userRanks: userRanks.length,
            userUsers: userUsers.length,
            hasAuthData: !!(currentUser || userEmail || isLoggedIn)
        });
        
        // Clear localStorage to reload sample data (but preserve auth)
        localStorage.clear();
        
        // CRITICAL: Restore authentication data immediately after clear
        if (currentUser) localStorage.setItem('currentUser', currentUser);
        if (userEmail) localStorage.setItem('userEmail', userEmail);
        if (isLoggedIn) localStorage.setItem('isLoggedIn', isLoggedIn);
        
        // Reload sample data
        this.loadSampleData();
        
        // Restore user data
        this.burgers = [...this.burgers, ...userBurgers];
        this.restaurants = [...this.restaurants, ...userRestaurants];
        this.ranks = userRanks;
        this.users = userUsers;
        
        // Save the merged data
        this.saveData();
        
        console.log('Migration complete. Total data:', {
            burgers: this.burgers.length,
            restaurants: this.restaurants.length,
            ranks: this.ranks.length,
            users: this.users.length
        });
    }

    // Future version-specific migrations can be added here
    handleVersionMigration(oldVersion, newVersion, data) {
        // Example: When we add new fields to restaurants
        if (oldVersion === '1.0.0' && newVersion === '1.1.0') {
            // Add new fields to existing restaurants
            data.restaurants.forEach(restaurant => {
                if (!restaurant.instagram) restaurant.instagram = '';
                if (!restaurant.doordash) restaurant.doordash = '';
            });
        }
        
        // Example: When we change data structure
        if (oldVersion === '1.1.0' && newVersion === '1.2.0') {
            // Handle any structural changes
        }
        
        return data;
    }

    // Convert any object URLs to base64 for permanent storage
    convertObjectUrlsToBase64() {
        let hasChanges = false;
        
        this.burgers.forEach(burger => {
            if (burger.imageUrl && burger.imageUrl.startsWith('blob:')) {
                // This is an object URL that won't persist
                // We'll need to remove it and let the user re-upload
                console.log('Removing invalid object URL for burger:', burger.name);
                burger.imageUrl = null;
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            this.saveData();
            this.showToast('Some photos were reset due to storage changes. Please re-upload them.', 'info');
        }
    }

    saveData() {
        // Create multiple backups for safety
        const backup = {
            burgers: this.burgers,
            restaurants: this.restaurants,
            ranks: this.ranks,
            users: this.users,
            timestamp: new Date().toISOString()
        };
        
        // Primary backup
        localStorage.setItem('dataBackup', JSON.stringify(backup));
        
        // Secondary backup with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        localStorage.setItem(`dataBackup_${timestamp}`, JSON.stringify(backup));
        
        // Keep only last 5 backups
        this.cleanupOldBackups();
        
        // Save current data
        localStorage.setItem('burgers', JSON.stringify(this.burgers));
        localStorage.setItem('restaurants', JSON.stringify(this.restaurants));
        localStorage.setItem('ranks', JSON.stringify(this.ranks));
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    cleanupOldBackups() {
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('dataBackup_'));
        if (backupKeys.length > 5) {
            backupKeys.sort().slice(0, -5).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    attemptDataRecovery() {
        console.log('Attempting data recovery...');
        
        // Try primary backup first
        const backup = localStorage.getItem('dataBackup');
        if (backup) {
            try {
                const data = JSON.parse(backup);
                this.restoreFromBackup(data, 'primary backup');
                return;
            } catch (error) {
                console.error('Primary backup recovery failed:', error);
            }
        }
        
        // Try timestamped backups
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('dataBackup_'));
        if (backupKeys.length > 0) {
            // Sort by timestamp (newest first)
            backupKeys.sort().reverse();
            for (const key of backupKeys) {
                try {
                    const backupData = localStorage.getItem(key);
                    const data = JSON.parse(backupData);
                    this.restoreFromBackup(data, `backup: ${key}`);
                    return;
                } catch (error) {
                    console.error(`Backup ${key} recovery failed:`, error);
                }
            }
        }
        
        // Try to find any existing data in localStorage
        const allKeys = Object.keys(localStorage);
        console.log('Available localStorage keys:', allKeys);
        
        // Look for any burger/restaurant data
        for (const key of allKeys) {
            if (key.includes('burger') || key.includes('restaurant') || key.includes('rank') || key.includes('user')) {
                console.log('Found potential data in key:', key);
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    console.log('Data in', key, ':', data);
                } catch (e) {
                    console.log('Key', key, 'is not JSON data');
                }
            }
        }
        
        this.showToast('No backup found. Check console for available data.', 'error');
    }

    restoreFromBackup(data, source) {
        this.burgers = data.burgers || [];
        this.restaurants = data.restaurants || [];
        this.ranks = data.ranks || [];
        this.users = data.users || [];
        this.saveData();
        this.showToast(`Data recovered from ${source}!`, 'success');
        this.loadLeaderboard();
        console.log(`Recovered ${this.burgers.length} burgers, ${this.restaurants.length} restaurants, ${this.ranks.length} ranks, ${this.users.length} users`);
    }

    loadSampleData() {
        // Chicagoland ZIP codes for realistic distribution
        const chicagoZips = [
            "60601", "60602", "60603", "60604", "60605", "60606", "60607", "60608", "60609", "60610",
            "60611", "60612", "60613", "60614", "60615", "60616", "60617", "60618", "60619", "60620",
            "60621", "60622", "60623", "60624", "60625", "60626", "60628", "60629", "60630", "60631",
            "60632", "60633", "60634", "60636", "60637", "60638", "60639", "60640", "60641", "60642",
            "60643", "60644", "60645", "60646", "60647", "60649", "60651", "60652", "60653", "60654",
            "60655", "60656", "60657", "60659", "60660", "60661", "60664", "60666", "60668", "60669",
            "60670", "60673", "60674", "60675", "60677", "60678", "60680", "60681", "60682", "60684",
            "60685", "60686", "60687", "60688", "60689", "60690", "60691", "60693", "60694", "60695",
            "60696", "60697", "60699", "60699"
        ];

        // Sample restaurants across Chicagoland
        const sampleRestaurants = [
            // Downtown Chicago
            { id: 'rest1', name: "Burger Palace", address: "123 Michigan Ave, Chicago, IL 60601", zip: "60601", state: "IL", phone: "(312) 123-4567", website: "https://burgerpalace.com", instagram: "https://instagram.com/burgerpalace", doordash: "https://doordash.com/store/burger-palace", reservationUrl: "https://opentable.com/burgerpalace" },
            { id: 'rest2', name: "Juicy Lucy's", address: "456 State St, Chicago, IL 60605", zip: "60605", state: "IL", phone: "(312) 234-5678", website: "https://juicylucys.com", instagram: "https://instagram.com/juicylucys", doordash: "https://doordash.com/store/juicy-lucys", reservationUrl: "https://opentable.com/juicylucys" },
            { id: 'rest3', name: "The Burger Joint", address: "789 Wabash Ave, Chicago, IL 60605", zip: "60605", state: "IL", phone: "(312) 345-6789", website: "https://theburgerjoint.com", instagram: "https://instagram.com/theburgerjoint", doordash: "https://doordash.com/store/the-burger-joint", reservationUrl: "https://opentable.com/theburgerjoint" },
            
            // Lincoln Park
            { id: 'rest4', name: "Chicago Burger Co", address: "321 Lincoln Ave, Chicago, IL 60614", zip: "60614", state: "IL", phone: "(773) 456-7890", website: "https://chicagoburgerco.com", instagram: "https://instagram.com/chicagoburgerco", doordash: "https://doordash.com/store/chicago-burger-co", reservationUrl: "https://opentable.com/chicagoburgerco" },
            { id: 'rest5', name: "Windy City Burgers", address: "654 Clark St, Chicago, IL 60614", zip: "60614", state: "IL", phone: "(773) 567-8901", website: "https://windycityburgers.com", instagram: "https://instagram.com/windycityburgers", doordash: "https://doordash.com/store/windy-city-burgers", reservationUrl: "https://opentable.com/windycityburgers" },
            { id: 'rest6', name: "Lakeview Burger Bar", address: "987 Belmont Ave, Chicago, IL 60614", zip: "60614", state: "IL", phone: "(773) 678-9012", website: "https://lakeviewburgerbar.com", instagram: "https://instagram.com/lakeviewburgerbar", doordash: "https://doordash.com/store/lakeview-burger-bar", reservationUrl: "https://opentable.com/lakeviewburgerbar" },
            
            // Wicker Park
            { id: 'rest7', name: "The Burger Spot", address: "147 Milwaukee Ave, Chicago, IL 60622", zip: "60622", state: "IL", phone: "(773) 789-0123", website: "https://theburgerspot.com", instagram: "https://instagram.com/theburgerspot", doordash: "https://doordash.com/store/the-burger-spot", reservationUrl: "https://opentable.com/theburgerspot" },
            { id: 'rest8', name: "Burger Haven", address: "258 North Ave, Chicago, IL 60622", zip: "60622", state: "IL", phone: "(773) 890-1234", website: "https://burgerhaven.com", instagram: "https://instagram.com/burgerhaven", doordash: "https://doordash.com/store/burger-haven", reservationUrl: "https://opentable.com/burgerhaven" },
            
            // River North
            { id: 'rest9', name: "River North Grill", address: "456 N Wells St, Chicago, IL 60654", zip: "60654", state: "IL", phone: "(312) 111-2222", website: "https://rivernorthgrill.com", instagram: "https://instagram.com/rivernorthgrill", doordash: "https://doordash.com/store/river-north-grill", reservationUrl: "https://opentable.com/rivernorthgrill" },
            { id: 'rest10', name: "Gold Coast Burgers", address: "789 N Rush St, Chicago, IL 60611", zip: "60611", state: "IL", phone: "(312) 222-3333", website: "https://goldcoastburgers.com", instagram: "https://instagram.com/goldcoastburgers", doordash: "https://doordash.com/store/gold-coast-burgers", reservationUrl: "https://opentable.com/goldcoastburgers" },
            
            // West Loop
            { id: 'rest11', name: "West Loop Burger Co", address: "123 W Randolph St, Chicago, IL 60601", zip: "60601", state: "IL", phone: "(312) 333-4444", website: "https://westloopburger.com", instagram: "https://instagram.com/westloopburger", doordash: "https://doordash.com/store/west-loop-burger", reservationUrl: "https://opentable.com/westloopburger" },
            { id: 'rest12', name: "Fulton Market Deli", address: "456 W Fulton Market, Chicago, IL 60607", zip: "60607", state: "IL", phone: "(312) 444-5555", website: "https://fultonmarketdeli.com", instagram: "https://instagram.com/fultonmarketdeli", doordash: "https://doordash.com/store/fulton-market-deli", reservationUrl: "https://opentable.com/fultonmarketdeli" },
            
            // Bucktown
            { id: 'rest13', name: "Bucktown Burgers", address: "789 N Damen Ave, Chicago, IL 60622", zip: "60622", state: "IL", phone: "(773) 555-6666", website: "https://bucktownburgers.com", instagram: "https://instagram.com/bucktownburgers", doordash: "https://doordash.com/store/bucktown-burgers", reservationUrl: "https://opentable.com/bucktownburgers" },
            { id: 'rest14', name: "Wicker Park Deluxe", address: "321 N Milwaukee Ave, Chicago, IL 60622", zip: "60622", state: "IL", phone: "(773) 666-7777", website: "https://wickerparkdeluxe.com", instagram: "https://instagram.com/wickerparkdeluxe", doordash: "https://doordash.com/store/wicker-park-deluxe", reservationUrl: "https://opentable.com/wickerparkdeluxe" },
            
            // Logan Square
            { id: 'rest15', name: "Logan Square Burger", address: "654 N Milwaukee Ave, Chicago, IL 60647", zip: "60647", state: "IL", phone: "(773) 777-8888", website: "https://logansquareburger.com", instagram: "https://instagram.com/logansquareburger", doordash: "https://doordash.com/store/logan-square-burger", reservationUrl: "https://opentable.com/logansquareburger" },
            { id: 'rest16', name: "Blue Line Burgers", address: "987 N Kedzie Ave, Chicago, IL 60647", zip: "60647", state: "IL", phone: "(773) 888-9999", website: "https://bluelineburgers.com", instagram: "https://instagram.com/bluelineburgers", doordash: "https://doordash.com/store/blue-line-burgers", reservationUrl: "https://opentable.com/bluelineburgers" },
            
            // Lakeview
            { id: 'rest17', name: "Lakeview Deluxe", address: "147 W Belmont Ave, Chicago, IL 60657", zip: "60657", state: "IL", phone: "(773) 999-0000", website: "https://lakeviewdeluxe.com", instagram: "https://instagram.com/lakeviewdeluxe", doordash: "https://doordash.com/store/lakeview-deluxe", reservationUrl: "https://opentable.com/lakeviewdeluxe" },
            { id: 'rest18', name: "Boystown Burgers", address: "258 N Halsted St, Chicago, IL 60661", zip: "60661", state: "IL", phone: "(773) 000-1111", website: "https://boystownburgers.com", instagram: "https://instagram.com/boystownburgers", doordash: "https://doordash.com/store/boystown-burgers", reservationUrl: "https://opentable.com/boystownburgers" },
            
            // Andersonville
            { id: 'rest19', name: "Andersonville Grill", address: "456 N Clark St, Chicago, IL 60640", zip: "60640", state: "IL", phone: "(773) 111-2222", website: "https://andersonvillegrill.com", instagram: "https://instagram.com/andersonvillegrill", doordash: "https://doordash.com/store/andersonville-grill", reservationUrl: "https://opentable.com/andersonvillegrill" },
            { id: 'rest20', name: "Clark Street Classic", address: "789 N Clark St, Chicago, IL 60640", zip: "60640", state: "IL", phone: "(773) 222-3333", website: "https://clarkstreetclassic.com", instagram: "https://instagram.com/clarkstreetclassic", doordash: "https://doordash.com/store/clark-street-classic", reservationUrl: "https://opentable.com/clarkstreetclassic" },
            
            // Edgewater
            { id: 'rest21', name: "Edgewater Eats", address: "123 W Bryn Mawr Ave, Chicago, IL 60660", zip: "60660", state: "IL", phone: "(773) 333-4444", website: "https://edgewatereats.com", instagram: "https://instagram.com/edgewatereats", doordash: "https://doordash.com/store/edgewater-eats", reservationUrl: "https://opentable.com/edgewatereats" },
            { id: 'rest22', name: "Rogers Park Burger", address: "456 W Devon Ave, Chicago, IL 60660", zip: "60660", state: "IL", phone: "(773) 444-5555", website: "https://rogersparkburger.com", instagram: "https://instagram.com/rogersparkburger", doordash: "https://doordash.com/store/rogers-park-burger", reservationUrl: "https://opentable.com/rogersparkburger" },
            
            // Hyde Park
            { id: 'rest23', name: "Hyde Park Deli", address: "789 E 53rd St, Chicago, IL 60615", zip: "60615", state: "IL", phone: "(773) 555-6666", website: "https://hydeparkdeli.com", instagram: "https://instagram.com/hydeparkdeli", doordash: "https://doordash.com/store/hyde-park-deli", reservationUrl: "https://opentable.com/hydeparkdeli" },
            { id: 'rest24', name: "University Burger", address: "321 E 57th St, Chicago, IL 60637", zip: "60637", state: "IL", phone: "(773) 666-7777", website: "https://universityburger.com", instagram: "https://instagram.com/universityburger", doordash: "https://doordash.com/store/university-burger", reservationUrl: "https://opentable.com/universityburger" },
            
            // Pilsen
            { id: 'rest25', name: "Pilsen Taqueria", address: "654 W 18th St, Chicago, IL 60616", zip: "60616", state: "IL", phone: "(773) 777-8888", website: "https://pilsentaqueria.com", instagram: "https://instagram.com/pilsentaqueria", doordash: "https://doordash.com/store/pilsen-taqueria", reservationUrl: "https://opentable.com/pilsentaqueria" },
            { id: 'rest26', name: "Bridgeport Burger", address: "987 W 31st St, Chicago, IL 60616", zip: "60616", state: "IL", phone: "(773) 888-9999", website: "https://bridgeportburger.com", instagram: "https://instagram.com/bridgeportburger", doordash: "https://doordash.com/store/bridgeport-burger", reservationUrl: "https://opentable.com/bridgeportburger" },
            
            // Chinatown
            { id: 'rest27', name: "Chinatown Express", address: "147 W Cermak Rd, Chicago, IL 60616", zip: "60616", state: "IL", phone: "(773) 999-0000", website: "https://chinatownexpress.com", instagram: "https://instagram.com/chinatownexpress", doordash: "https://doordash.com/store/chinatown-express", reservationUrl: "https://opentable.com/chinatownexpress" },
            { id: 'rest28', name: "South Loop Grill", address: "258 S Michigan Ave, Chicago, IL 60604", zip: "60604", state: "IL", phone: "(312) 000-1111", website: "https://southloopgrill.com", instagram: "https://instagram.com/southloopgrill", doordash: "https://doordash.com/store/south-loop-grill", reservationUrl: "https://opentable.com/southloopgrill" },
            
            // Ukrainian Village
            { id: 'rest29', name: "Ukrainian Village Deli", address: "456 W Chicago Ave, Chicago, IL 60654", zip: "60654", state: "IL", phone: "(312) 111-2222", website: "https://ukrainianvillagedeli.com", instagram: "https://instagram.com/ukrainianvillagedeli", doordash: "https://doordash.com/store/ukrainian-village-deli", reservationUrl: "https://opentable.com/ukrainianvillagedeli" },
            { id: 'rest30', name: "West Town Burger", address: "789 W Grand Ave, Chicago, IL 60642", zip: "60642", state: "IL", phone: "(312) 222-3333", website: "https://westtownburger.com", instagram: "https://instagram.com/westtownburger", doordash: "https://doordash.com/store/west-town-burger", reservationUrl: "https://opentable.com/westtownburger" }
        ];

        // Massive burger list with 50+ burgers
        const sampleBurgers = [
            // Downtown Chicago
            { id: 'burger1', name: "Classic Cheeseburger", restaurantId: 'rest1', imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop" },
            { id: 'burger2', name: "Bacon Deluxe", restaurantId: 'rest1', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger3', name: "Mushroom Swiss", restaurantId: 'rest2', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger4', name: "Double Stack", restaurantId: 'rest2', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            { id: 'burger5', name: "Chicago Style Burger", restaurantId: 'rest3', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger6', name: "Truffle Burger", restaurantId: 'rest3', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            
            // Lincoln Park
            { id: 'burger7', name: "Windy City Special", restaurantId: 'rest4', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger8', name: "Lakeview Deluxe", restaurantId: 'rest4', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            { id: 'burger9', name: "Belmont Burger", restaurantId: 'rest5', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger10', name: "Sheffield Classic", restaurantId: 'rest5', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger11', name: "Southport Smash", restaurantId: 'rest6', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger12', name: "Haven House Special", restaurantId: 'rest6', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Wicker Park
            { id: 'burger13', name: "Lincoln Ave Legend", restaurantId: 'rest7', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger14', name: "Clark Street Classic", restaurantId: 'rest7', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger15', name: "Veggie Delight", restaurantId: 'rest8', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger16', name: "Spicy Jalapeño", restaurantId: 'rest8', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // River North
            { id: 'burger17', name: "Blue Cheese Supreme", restaurantId: 'rest9', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger18', name: "BBQ Ranch", restaurantId: 'rest9', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger19', name: "Avocado Ranch", restaurantId: 'rest10', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger20', name: "Gold Coast Classic", restaurantId: 'rest10', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // West Loop
            { id: 'burger21', name: "West Loop Deluxe", restaurantId: 'rest11', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger22', name: "Fulton Market Special", restaurantId: 'rest11', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger23', name: "Market Street Burger", restaurantId: 'rest12', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger24', name: "Industrial Burger", restaurantId: 'rest12', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Bucktown
            { id: 'burger25', name: "Bucktown Classic", restaurantId: 'rest13', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger26', name: "Damen Deluxe", restaurantId: 'rest13', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger27', name: "Wicker Park Supreme", restaurantId: 'rest14', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger28', name: "Milwaukee Special", restaurantId: 'rest14', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Logan Square
            { id: 'burger29', name: "Logan Square Classic", restaurantId: 'rest15', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger30', name: "Kedzie Deluxe", restaurantId: 'rest15', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger31', name: "Blue Line Special", restaurantId: 'rest16', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger32', name: "Milwaukee Ave Classic", restaurantId: 'rest16', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Lakeview
            { id: 'burger33', name: "Lakeview Classic", restaurantId: 'rest17', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger34', name: "Belmont Deluxe", restaurantId: 'rest17', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger35', name: "Boystown Special", restaurantId: 'rest18', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger36', name: "Halsted Classic", restaurantId: 'rest18', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Andersonville
            { id: 'burger37', name: "Andersonville Classic", restaurantId: 'rest19', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger38', name: "Clark Street Deluxe", restaurantId: 'rest19', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger39', name: "Clark Street Classic", restaurantId: 'rest20', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger40', name: "North Side Special", restaurantId: 'rest20', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Edgewater
            { id: 'burger41', name: "Edgewater Classic", restaurantId: 'rest21', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger42', name: "Bryn Mawr Deluxe", restaurantId: 'rest21', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger43', name: "Rogers Park Classic", restaurantId: 'rest22', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger44', name: "Devon Deluxe", restaurantId: 'rest22', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Hyde Park
            { id: 'burger45', name: "Hyde Park Classic", restaurantId: 'rest23', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger46', name: "53rd Street Deluxe", restaurantId: 'rest23', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger47', name: "University Classic", restaurantId: 'rest24', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger48', name: "57th Street Special", restaurantId: 'rest24', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Pilsen
            { id: 'burger49', name: "Pilsen Classic", restaurantId: 'rest25', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger50', name: "18th Street Deluxe", restaurantId: 'rest25', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger51', name: "Bridgeport Classic", restaurantId: 'rest26', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger52', name: "31st Street Special", restaurantId: 'rest26', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Chinatown
            { id: 'burger53', name: "Chinatown Classic", restaurantId: 'rest27', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger54', name: "Cermak Deluxe", restaurantId: 'rest27', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger55', name: "South Loop Classic", restaurantId: 'rest28', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger56', name: "Michigan Ave Special", restaurantId: 'rest28', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Ukrainian Village
            { id: 'burger57', name: "Ukrainian Village Classic", restaurantId: 'rest29', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
            { id: 'burger58', name: "Chicago Ave Deluxe", restaurantId: 'rest29', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger59', name: "West Town Classic", restaurantId: 'rest30', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger60', name: "Grand Ave Special", restaurantId: 'rest30', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            
            // Additional 5 burgers
            { id: 'burger61', name: "The Big Dipper", restaurantId: 'rest1', imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop" },
            { id: 'burger62', name: "Smokehouse Special", restaurantId: 'rest4', imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop" },
            { id: 'burger63', name: "Pepper Jack Deluxe", restaurantId: 'rest7', imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop" },
            { id: 'burger64', name: "Bacon Cheeseburger", restaurantId: 'rest10', imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop" },
            { id: 'burger65', name: "The Works Burger", restaurantId: 'rest14', imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" }
        ];

        // Sample users
        const sampleUsers = [
            {
                id: 'user1',
                userId: 'burgerlover',
                email: 'john@example.com',
                phone: '(555) 111-1111',
                savedLists: []
            },
            {
                id: 'user2',
                userId: 'foodie',
                email: 'sarah@example.com',
                phone: '(555) 222-2222',
                savedLists: []
            }
        ];

        // Sample ranks
        const sampleRanks = [
            { id: 'rank1', userId: 'user1', burgerId: 'burger1', score: 2, date: new Date(Date.now() - 86400000).toISOString(), comment: "Amazing burger! Juicy and flavorful.", photoUrl: null },
            { id: 'rank2', userId: 'user2', burgerId: 'burger1', score: 2, date: new Date(Date.now() - 172800000).toISOString(), comment: "Best burger I've ever had!", photoUrl: null },
            { id: 'rank3', userId: 'user1', burgerId: 'burger2', score: 1, date: new Date(Date.now() - 259200000).toISOString(), comment: "Good but could be better.", photoUrl: null },
            { id: 'rank4', userId: 'user2', burgerId: 'burger3', score: 2, date: new Date(Date.now() - 345600000).toISOString(), comment: "Perfect mushroom burger!", photoUrl: null },
            { id: 'rank5', userId: 'user1', burgerId: 'burger4', score: 0, date: new Date(Date.now() - 432000000).toISOString(), comment: "Decent but nothing special.", photoUrl: null },
            { id: 'rank6', userId: 'user2', burgerId: 'burger5', score: 2, date: new Date(Date.now() - 518400000).toISOString(), comment: "Chicago style perfection!", photoUrl: null },
            { id: 'rank7', userId: 'user1', burgerId: 'burger6', score: 2, date: new Date(Date.now() - 604800000).toISOString(), comment: "Truffle makes everything better!", photoUrl: null },
            { id: 'rank8', userId: 'user2', burgerId: 'burger7', score: 1, date: new Date(Date.now() - 691200000).toISOString(), comment: "Solid Windy City burger.", photoUrl: null },
            { id: 'rank9', userId: 'user1', burgerId: 'burger8', score: 2, date: new Date(Date.now() - 777600000).toISOString(), comment: "Lakeview never disappoints!", photoUrl: null },
            { id: 'rank10', userId: 'user2', burgerId: 'burger9', score: 0, date: new Date(Date.now() - 864000000).toISOString(), comment: "Average at best.", photoUrl: null },
            { id: 'rank11', userId: 'user1', burgerId: 'burger10', score: 1, date: new Date(Date.now() - 950400000).toISOString(), comment: "Good classic burger.", photoUrl: null },
            { id: 'rank12', userId: 'user2', burgerId: 'burger11', score: 2, date: new Date(Date.now() - 1036800000).toISOString(), comment: "Southport smash is amazing!", photoUrl: null },
            { id: 'rank13', userId: 'user1', burgerId: 'burger12', score: 1, date: new Date(Date.now() - 1123200000).toISOString(), comment: "Haven House special is worth trying.", photoUrl: null },
            { id: 'rank14', userId: 'user2', burgerId: 'burger13', score: 2, date: new Date(Date.now() - 1209600000).toISOString(), comment: "Lincoln Ave legend lives up to its name!", photoUrl: null },
            { id: 'rank15', userId: 'user1', burgerId: 'burger14', score: 0, date: new Date(Date.now() - 1296000000).toISOString(), comment: "Clark Street classic is just okay.", photoUrl: null },
            { id: 'rank16', userId: 'user2', burgerId: 'burger15', score: 1, date: new Date(Date.now() - 1382400000).toISOString(), comment: "Good veggie option.", photoUrl: null },
            { id: 'rank17', userId: 'user1', burgerId: 'burger16', score: 2, date: new Date(Date.now() - 1468800000).toISOString(), comment: "Spicy jalapeño has the perfect kick!", photoUrl: null },
            { id: 'rank18', userId: 'user2', burgerId: 'burger17', score: 1, date: new Date(Date.now() - 1555200000).toISOString(), comment: "Blue cheese is strong but good.", photoUrl: null },
            { id: 'rank19', userId: 'user1', burgerId: 'burger18', score: 2, date: new Date(Date.now() - 1641600000).toISOString(), comment: "BBQ ranch combo is incredible!", photoUrl: null },
            { id: 'rank20', userId: 'user2', burgerId: 'burger19', score: 1, date: new Date(Date.now() - 1728000000).toISOString(), comment: "Avocado ranch is fresh and tasty.", photoUrl: null },
            { id: 'rank21', userId: 'user1', burgerId: 'burger5', score: 2, date: new Date(Date.now() - 1814400000).toISOString(), comment: "Second time having this - still amazing!", photoUrl: null },
            { id: 'rank22', userId: 'user2', burgerId: 'burger7', score: 2, date: new Date(Date.now() - 1900800000).toISOString(), comment: "Windy City special is now my favorite!", photoUrl: null },
            { id: 'rank23', userId: 'user1', burgerId: 'burger12', score: 2, date: new Date(Date.now() - 1987200000).toISOString(), comment: "Haven House special exceeded expectations!", photoUrl: null },
            { id: 'rank24', userId: 'user2', burgerId: 'burger3', score: 1, date: new Date(Date.now() - 2073600000).toISOString(), comment: "Mushroom Swiss is consistently good.", photoUrl: null },
            { id: 'rank25', userId: 'user1', burgerId: 'burger8', score: 2, date: new Date(Date.now() - 2160000000).toISOString(), comment: "Lakeview Deluxe is a must-try!", photoUrl: null },
            
            // Reviews for new burgers
            { id: 'rank26', userId: 'user1', burgerId: 'burger61', score: 2, date: new Date(Date.now() - 86400000).toISOString(), comment: "The Big Dipper lives up to its name - huge and delicious!", photoUrl: null },
            { id: 'rank27', userId: 'user2', burgerId: 'burger61', score: 1, date: new Date(Date.now() - 172800000).toISOString(), comment: "Great classic burger, perfect bun to meat ratio.", photoUrl: null },
            { id: 'rank28', userId: 'user1', burgerId: 'burger62', score: 2, date: new Date(Date.now() - 259200000).toISOString(), comment: "Smokehouse Special has amazing smoky flavor!", photoUrl: null },
            { id: 'rank29', userId: 'user2', burgerId: 'burger62', score: 2, date: new Date(Date.now() - 345600000).toISOString(), comment: "Best smoked burger I've had in Chicago!", photoUrl: null },
            { id: 'rank30', userId: 'user1', burgerId: 'burger63', score: 1, date: new Date(Date.now() - 432000000).toISOString(), comment: "Pepper Jack Deluxe has the perfect amount of spice.", photoUrl: null },
            { id: 'rank31', userId: 'user2', burgerId: 'burger63', score: 2, date: new Date(Date.now() - 518400000).toISOString(), comment: "Love the pepper jack cheese on this one!", photoUrl: null },
            { id: 'rank32', userId: 'user1', burgerId: 'burger64', score: 2, date: new Date(Date.now() - 604800000).toISOString(), comment: "Bacon Cheeseburger is crispy and perfect.", photoUrl: null },
            { id: 'rank33', userId: 'user2', burgerId: 'burger64', score: 1, date: new Date(Date.now() - 691200000).toISOString(), comment: "Solid bacon cheeseburger, good quality ingredients.", photoUrl: null },
            { id: 'rank34', userId: 'user1', burgerId: 'burger65', score: 2, date: new Date(Date.now() - 777600000).toISOString(), comment: "The Works Burger has everything you could want!", photoUrl: null },
            { id: 'rank35', userId: 'user2', burgerId: 'burger65', score: 2, date: new Date(Date.now() - 864000000).toISOString(), comment: "This burger is loaded with toppings - amazing!", photoUrl: null }
        ];

        this.restaurants = sampleRestaurants;
        this.burgers = sampleBurgers;
        this.users = sampleUsers;
        this.ranks = sampleRanks;
        
        // Skip random review generation entirely to prevent hanging
        console.log('Skipping random review generation for performance');
        
        try {
            this.saveData();
        } catch (error) {
            console.error('Error saving data:', error);
            // Continue even if save fails
        }
    }

    generateRandomReviews() {
        // Sample user IDs for random reviews
        const randomUserIds = ['user1', 'user2', 'burgerlover', 'foodie', 'chicagofoodie', 'burgerhunter', 'tastebuds', 'grubmaster', 'chefchris', 'foodfanatic'];
        
        // Sample comments for variety
        const positiveComments = [
            "Absolutely delicious! The flavors are perfectly balanced.",
            "This burger exceeded my expectations. Highly recommend!",
            "Juicy and flavorful - exactly what I was looking for.",
            "Great quality ingredients and perfect cooking.",
            "The bun is fresh and the meat is perfectly seasoned.",
            "Love the texture and taste. Will definitely order again.",
            "This is now my go-to burger spot in the area.",
            "Amazing burger with great presentation.",
            "The toppings are fresh and the cheese is melted perfectly.",
            "Solid burger with good portion size.",
            "Really enjoyed this one. The sauce is incredible.",
            "Perfect burger for a casual meal.",
            "The meat quality is outstanding.",
            "Great value for the price. Tasty and filling.",
            "This burger hits all the right notes.",
            "Incredible flavor profile! The seasoning is spot on.",
            "Best burger I've had in weeks. Fresh ingredients make all the difference.",
            "The patty is cooked to perfection - juicy and tender.",
            "Love the creative toppings and unique flavor combinations.",
            "This place knows how to make a proper burger!",
            "The bun-to-meat ratio is perfect. Great texture throughout.",
            "Excellent service and the burger was served hot and fresh.",
            "The cheese melts perfectly and adds great flavor.",
            "This burger is worth every penny. Quality ingredients throughout.",
            "I'm impressed by the attention to detail in every bite.",
            "The sauce is house-made and absolutely delicious.",
            "Perfect for a satisfying lunch or dinner. Highly recommend!",
            "The burger is cooked exactly how I like it - medium rare perfection!",
            "Amazing flavor combinations that work perfectly together.",
            "The portion size is generous and the quality is top-notch.",
            "This burger has become my new favorite in the city!",
            "The attention to detail in preparation is impressive.",
            "Fresh, local ingredients really make this burger shine.",
            "The seasoning is perfectly balanced - not too salty, not too bland.",
            "I love the creative twist on a classic burger.",
            "The patty is thick and juicy, exactly what I was craving."
        ];
        
        const neutralComments = [
            "Pretty good burger overall.",
            "Decent quality, nothing special but satisfying.",
            "It's okay, I've had better but it's not bad.",
            "Standard burger, meets expectations.",
            "Good for a quick meal.",
            "The burger is fine, nothing to write home about.",
            "Decent portion size and taste.",
            "It's a solid choice if you're in the area.",
            "Average burger, does the job.",
            "Not bad, but could be better.",
            "The burger is acceptable, nothing remarkable.",
            "It's a standard offering that gets the job done.",
            "Decent value for the money spent.",
            "The taste is okay, but nothing memorable.",
            "It's a reliable choice when you're hungry.",
            "The burger meets basic expectations.",
            "Fair quality for the price point.",
            "It's edible and filling, which is what matters.",
            "The burger is passable, but not outstanding.",
            "It's a middle-of-the-road option.",
            "The burger is adequate for a quick bite.",
            "Standard fare that won't disappoint or impress.",
            "It's a reliable option when you need something filling.",
            "The burger is functional but forgettable.",
            "Decent enough to satisfy hunger, but not memorable."
        ];
        
        const negativeComments = [
            "A bit disappointing, expected more flavor.",
            "The burger was dry and overcooked.",
            "Not worth the price in my opinion.",
            "The bun was stale and the meat was bland.",
            "I've had much better burgers elsewhere.",
            "The quality doesn't match the price.",
            "Too greasy and heavy for my taste.",
            "The toppings were not fresh.",
            "Disappointing experience overall.",
            "Would not recommend this one.",
            "The meat was tough and flavorless.",
            "The burger was cold when it arrived.",
            "Overpriced for what you get.",
            "The bun fell apart and was soggy.",
            "The cheese wasn't melted properly.",
            "The patty was too thin and overcooked.",
            "The toppings were sparse and unimpressive.",
            "The burger lacked seasoning and was bland.",
            "The service was slow and the food was mediocre.",
            "I expected better quality for this price point.",
            "The burger was served lukewarm and unappetizing.",
            "The meat tasted like it was frozen and reheated.",
            "The bun was hard and the patty was dry.",
            "Not worth the wait or the money spent.",
            "The overall experience was disappointing."
        ];
        
        let reviewId = 36; // Start after existing reviews
        
        // Generate 2 random reviews for each burger (minimal to prevent hanging)
        this.burgers.forEach(burger => {
            for (let i = 0; i < 2; i++) {
                // Random score (1-5, but convert to our -2 to +2 scale)
                const randomScore = Math.floor(Math.random() * 5) + 1;
                const score = randomScore === 1 ? -2 : randomScore === 2 ? -1 : randomScore === 3 ? 0 : randomScore === 4 ? 1 : 2;
                
                // Random user
                const randomUser = randomUserIds[Math.floor(Math.random() * randomUserIds.length)];
                
                // Random comment based on score
                let commentPool;
                if (score >= 1) {
                    commentPool = positiveComments;
                } else if (score === 0) {
                    commentPool = neutralComments;
                } else {
                    commentPool = negativeComments;
                }
                const comment = commentPool[Math.floor(Math.random() * commentPool.length)];
                
                // Random date within last 6 months
                const daysAgo = Math.floor(Math.random() * 180);
                const date = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)).toISOString();
                
                // Create review
                const review = {
                    id: `rank${reviewId}`,
                    userId: randomUser,
                    burgerId: burger.id,
                    score: score,
                    date: date,
                    comment: comment,
                    photoUrl: null
                };
                
                this.ranks.push(review);
                reviewId++;
            }
        });
        
        console.log(`Generated ${this.burgers.length * 30} additional random reviews. Total reviews: ${this.ranks.length}`);
    }

    // Screen Management
    showLoadingScreen() {
        try {
            this.currentScreen = 'loading';
            document.getElementById('loading-screen').style.display = 'flex';
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'none';
        } catch (error) {
            console.error('Error showing loading screen:', error);
        }
    }

    showAuthScreen() {
        try {
            console.log('Showing auth screen...');
            this.currentScreen = 'auth';
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('main-app').style.display = 'none';
        } catch (error) {
            console.error('Error showing auth screen:', error);
        }
    }

    showMainApp() {
        try {
            console.log('Showing main app...');
            this.currentScreen = 'main';
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            
            // Don't set a default location - show all burgers initially
            this.currentLocation = null;
            this.searchRadius = null;
            
            this.showScreen('home');
            // Load leaderboard immediately - will show all burgers
            this.loadLeaderboard();
        } catch (error) {
            console.error('Error showing main app:', error);
        }
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        console.log('Target screen element:', targetScreen);
        
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        } else {
            console.error('Screen not found:', `${screenName}-screen`);
        }

        // Load screen-specific content
        switch (screenName) {
            case 'home':
                this.loadLeaderboard();
                break;
            case 'restaurants':
                this.loadRestaurants();
                break;
            case 'lists':
                this.loadLists();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    // Authentication
    checkAuth() {
        try {
            console.log('Checking authentication...');
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log('User found:', this.currentUser.userId);
                this.showMainApp();
            } else {
                console.log('No saved user, showing auth screen');
                this.showAuthScreen();
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            this.showAuthScreen();
        }
    }

    login(email, password) {
        try {
            console.log('Login attempt for email:', email);
            
            // Validate inputs
            if (!email || !password) {
                this.showToast('Please enter both email and password', 'error');
                return false;
            }

            // Simple authentication - in real app, this would validate against server
            const user = this.users.find(u => u.email === email);
            console.log('Found user:', user ? user.userId : 'not found');
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.showMainApp();
                this.showToast(`Welcome back, ${user.userId}!`, 'success');
                return true;
            } else {
                this.showToast('Invalid email or password', 'error');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
            return false;
        }
    }

    signup(userId, email, phone, password) {
        try {
            console.log('Signup attempt for:', userId, email);
            
            // Validate inputs
            if (!userId || !email || !phone || !password) {
                this.showToast('Please fill in all fields', 'error');
                return false;
            }

            // Check if user ID already exists
            if (this.users.find(u => u.userId === userId)) {
                this.showToast('User ID already exists', 'error');
                return false;
            }

            // Check if email already exists
            const existingUser = this.users.find(u => u.email === email);
            if (existingUser) {
                this.showToast('Email already registered. Try logging in instead.', 'error');
                // Switch to login tab
                this.switchAuthTab('login');
                // Pre-fill the email
                document.getElementById('login-email').value = email;
                return false;
            }

            // Create new user
            const newUser = {
                id: this.generateId(),
                userId: userId,
                email: email,
                phone: phone,
                savedLists: []
            };

            this.users.push(newUser);
            this.saveData();
            this.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            this.showMainApp();
            this.showToast(`Welcome to BurgerRank, ${userId}!`, 'success');
            return true;
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Signup failed. Please try again.', 'error');
            return false;
        }
    }

    logout() {
        try {
            console.log('Logging out user');
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.showAuthScreen();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Error during logout:', error);
            // Force logout even if there's an error
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.showAuthScreen();
        }
    }

    // Ranking System
    calculateBurgerScore(burgerId) {
        const burgerRanks = this.ranks.filter(rank => rank.burgerId === burgerId);
        if (burgerRanks.length === 0) return 0;

        // Calculate raw average score (R)
        const totalScore = burgerRanks.reduce((sum, rank) => sum + rank.score, 0);
        const rawAverage = totalScore / burgerRanks.length;
        
        // Number of votes (v)
        const voteCount = burgerRanks.length;
        
        // Minimum votes for trustworthiness (m)
        const minVotes = 10;
        
        // Global average score across all dishes (C)
        const globalAverage = this.calculateGlobalAverage();
        
        // Bayesian Average Formula: (v/(v+m)) * R + (m/(v+m)) * C
        const weightedScore = (voteCount / (voteCount + minVotes)) * rawAverage + 
                             (minVotes / (voteCount + minVotes)) * globalAverage;
        
        // Convert to percentage: (score + 2) / 4 * 100
        const percentage = ((weightedScore + 2) / 4) * 100;
        
        return Math.round(percentage);
    }

    calculateGlobalAverage() {
        if (this.ranks.length === 0) return 0;
        
        const totalScore = this.ranks.reduce((sum, rank) => sum + rank.score, 0);
        const globalAverage = totalScore / this.ranks.length;
        
        return globalAverage;
    }

    getBurgerRanking(burgerId) {
        const allBurgers = this.burgers.map(burger => ({
            ...burger,
            score: this.calculateBurgerScore(burger.id),
            voteCount: this.getVoteCount(burger.id),
            rawScore: this.calculateRawScore(burger.id)
        }));

        // Sort by weighted score first, then by vote count for burgers with the same score
        allBurgers.sort((a, b) => {
            // First, sort by weighted score (higher score = higher rank)
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // If scores are equal, sort by vote count (more votes = higher rank)
            return b.voteCount - a.voteCount;
        });
        
        const ranking = allBurgers.findIndex(burger => burger.id === burgerId) + 1;
        return ranking;
    }

    calculateRawScore(burgerId) {
        const burgerRanks = this.ranks.filter(rank => rank.burgerId === burgerId);
        if (burgerRanks.length === 0) return 0;

        const totalScore = burgerRanks.reduce((sum, rank) => sum + rank.score, 0);
        const rawAverage = totalScore / burgerRanks.length;
        
        // Convert to percentage: (score + 2) / 4 * 100
        const percentage = ((rawAverage + 2) / 4) * 100;
        
        return Math.round(percentage);
    }

    submitRank(burgerName, restaurantName, rating, comment = '', photoFile = null) {
        let burger;
        let restaurant;

        // Check if we're ranking an existing burger
        if (this.currentRankingBurgerId) {
            burger = this.burgers.find(b => b.id === this.currentRankingBurgerId);
            restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
            
            // Clear the current ranking burger ID
            this.currentRankingBurgerId = null;
        } else {
            // Find or create restaurant
            restaurant = this.restaurants.find(r => r.name.toLowerCase() === restaurantName.toLowerCase());
            if (!restaurant) {
                // Get restaurant details from form
                const address = document.getElementById('restaurant-address').value.trim();
                const phone = document.getElementById('restaurant-phone').value.trim();
                const website = document.getElementById('restaurant-website').value.trim();
                const instagram = document.getElementById('restaurant-instagram').value.trim();
                const doordash = document.getElementById('restaurant-doordash').value.trim();
                const opentable = document.getElementById('restaurant-opentable').value.trim();
                
                restaurant = {
                    id: this.generateId(),
                    name: restaurantName,
                    address: address,
                    zip: this.currentLocation || '60614',
                    state: 'IL',
                    phone: phone,
                    website: website,
                    instagram: instagram,
                    doordash: doordash,
                    reservationUrl: opentable
                };
                this.restaurants.push(restaurant);
            } else {
                // Update existing restaurant with new details if provided
                const address = document.getElementById('restaurant-address').value.trim();
                const phone = document.getElementById('restaurant-phone').value.trim();
                const website = document.getElementById('restaurant-website').value.trim();
                const instagram = document.getElementById('restaurant-instagram').value.trim();
                const doordash = document.getElementById('restaurant-doordash').value.trim();
                const opentable = document.getElementById('restaurant-opentable').value.trim();
                
                if (address) restaurant.address = address;
                if (phone) restaurant.phone = phone;
                if (website) restaurant.website = website;
                if (instagram) restaurant.instagram = instagram;
                if (doordash) restaurant.doordash = doordash;
                if (opentable) restaurant.reservationUrl = opentable;
            }

            // Find or create burger
            burger = this.burgers.find(b => 
                b.name.toLowerCase() === burgerName.toLowerCase() && 
                b.restaurantId === restaurant.id
            );

            if (!burger) {
                burger = {
                    id: this.generateId(),
                    name: burgerName,
                    restaurantId: restaurant.id,
                    imageUrl: null
                };
                this.burgers.push(burger);
                
                // If there's a photo file, convert it to base64
                if (photoFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        burger.imageUrl = e.target.result;
                        this.saveData();
                    };
                    reader.readAsDataURL(photoFile);
                }
            }
        }

        // Create rank
        const rank = {
            id: this.generateId(),
            userId: this.currentUser.id,
            burgerId: burger.id,
            score: parseInt(rating) - 3, // Convert 1-5 to -2 to +2
            date: new Date().toISOString(),
            comment: comment,
            photoUrl: photoFile ? URL.createObjectURL(photoFile) : null
        };

        this.ranks.push(rank);
        this.saveData();

        // Re-enable form fields if they were disabled
        document.getElementById('burger-name').disabled = false;
        document.getElementById('restaurant-name').disabled = false;

        this.showToast('Rating submitted successfully!', 'success');
        this.showScreen('home');
        this.loadLeaderboard();
    }

    // Search functionality
    performSearch() {
        const zip = document.getElementById('zip-input').value.trim();
        const radius = document.getElementById('radius-input').value;
        
        if (!zip) {
            this.showToast('Please enter a ZIP code', 'error');
            return;
        }
        
        this.currentLocation = zip;
        this.searchRadius = parseInt(radius) || 10; // Default to 10 if invalid
        console.log('Searching with location:', this.currentLocation, 'radius:', this.searchRadius);
        this.loadLeaderboard();
        this.showToast(`Searching for burgers within ${this.searchRadius} miles of ${zip}`, 'success');
    }

    // Leaderboard
    loadLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        
        console.log('Loading leaderboard...');
        console.log('Current location:', this.currentLocation);
        console.log('Total burgers:', this.burgers.length);
        console.log('Total restaurants:', this.restaurants.length);
        
        // Get burgers with scores and filter by location
        let burgersWithScores = this.burgers.map(burger => {
            const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
            const voteCount = this.getVoteCount(burger.id);
            return {
                ...burger,
                restaurant: restaurant,
                score: this.calculateBurgerScore(burger.id),
                rawScore: this.calculateRawScore(burger.id),
                ranking: this.getBurgerRanking(burger.id),
                voteCount: voteCount
            };
        });

        console.log('All burgers:', this.burgers.map(b => ({ id: b.id, name: b.name, restaurantId: b.restaurantId })));
        console.log('Burgers with scores:', burgersWithScores.map(b => ({ id: b.id, name: b.name, restaurant: b.restaurant?.name })));

        console.log('Burgers with scores:', burgersWithScores.length);

        // Filter by location if specified
        if (this.currentLocation && this.searchRadius) {
            console.log('Filtering by location:', this.currentLocation, 'radius:', this.searchRadius);
            
            burgersWithScores = burgersWithScores.filter(burger => {
                if (!burger.restaurant || !burger.restaurant.zip) {
                    console.log('Burger without restaurant or ZIP:', burger.name);
                    return false;
                }
                
                const distance = this.calculateDistance(this.currentLocation, burger.restaurant.zip);
                console.log(`Burger: ${burger.name}, Restaurant: ${burger.restaurant.name}, ZIP: ${burger.restaurant.zip}, Distance: ${distance} miles`);
                
                const isInRange = distance <= this.searchRadius;
                if (!isInRange) {
                    console.log(`Excluding ${burger.name} - too far (${distance} miles > ${this.searchRadius} miles)`);
                }
                
                return isInRange;
            });
            console.log('Burgers after location filter:', burgersWithScores.length);
        }

        // Separate burgers into "Top Ranked" (10+ votes) and "New & Trending" (<10 votes)
        const topRanked = burgersWithScores.filter(burger => burger.voteCount >= 10);
        const newTrending = burgersWithScores.filter(burger => burger.voteCount < 10);

        // Sort "Top Ranked" by weighted score, then by vote count
        topRanked.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.voteCount - a.voteCount;
        });

        // Sort "New & Trending" by raw score, then by recency (most recent first)
        newTrending.sort((a, b) => {
            if (b.rawScore !== a.rawScore) {
                return b.rawScore - a.rawScore;
            }
            // For now, just use vote count as a proxy for recency
            return b.voteCount - a.voteCount;
        });

        // Determine which dataset to show based on current selection
        let burgersToShow = [];
        let sectionTitle = '';
        let sectionSubtitle = '';
        let sectionIcon = '';

        if (this.currentLeaderboardSection === 'new-trending') {
            burgersToShow = newTrending;
            sectionTitle = `New & Trending (${newTrending.length})`;
            sectionSubtitle = 'Burgers with <10 votes, ranked by raw score';
            sectionIcon = 'fas fa-fire';
        } else {
            // Default to top-ranked
            burgersToShow = topRanked;
            sectionTitle = `Top Ranked (${topRanked.length})`;
            sectionSubtitle = 'Burgers with 10+ votes, ranked by weighted score';
            sectionIcon = 'fas fa-trophy';
        }

        if (burgersWithScores.length === 0) {
            leaderboard.innerHTML = `
                <div class="text-center" style="color: white; font-size: 1.2rem; margin-top: 2rem;">
                    No burgers found in ZIP code ${this.currentLocation}. Try a different location or add some ratings!
                </div>
            `;
            return;
        }

        console.log('Final burgers to display:', burgersWithScores.length);
        console.log('Top Ranked:', topRanked.length, 'New & Trending:', newTrending.length);

        // Build the leaderboard HTML with the selected dataset
        let leaderboardHTML = '';

        if (burgersToShow.length > 0) {
            leaderboardHTML += `
                <div class="leaderboard-section">
                    <div class="section-header">
                        <div class="section-title-group">
                            <h3 class="section-title">
                                <i class="${sectionIcon}"></i>
                                ${sectionTitle}
                            </h3>
                            <p class="section-subtitle">${sectionSubtitle}</p>
                        </div>
                        ${this.currentLeaderboardSection === 'top-ranked' ? `
                            <button class="btn btn-secondary learn-more-btn" onclick="app.showScoringExplanation()">
                                <i class="fas fa-info-circle"></i>
                                Learn More
                            </button>
                        ` : ''}
                    </div>
                    ${burgersToShow.map((burger, index) => {
                        const reviews = this.ranks.filter(rank => rank.burgerId === burger.id && rank.comment).slice(0, 2);
                        return `
                            <div class="leaderboard-item" data-burger-id="${burger.id}">
                                <div class="leaderboard-rank">#${index + 1}</div>
                                <div class="leaderboard-image">
                                    ${burger.imageUrl ? 
                                        `<img src="${burger.imageUrl}" alt="${burger.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                         <i class="fas fa-hamburger" style="display: none;"></i>` :
                                        `<i class="fas fa-hamburger"></i>`
                                    }
                                </div>
                                                            <div class="leaderboard-content">
                                <div class="leaderboard-main-content">
                                    <div class="leaderboard-burger-info">
                                        <div class="leaderboard-title">${burger.name}</div>
                                        <div class="leaderboard-restaurant">${burger.restaurant.name}</div>
                                        <div class="leaderboard-rating">
                                            <span class="rating-score">${burger.score}%</span>
                                            <div class="rating-stars">${this.getStarRating(burger.score)}</div>
                                            <div class="vote-counter">
                                                <i class="fas fa-users"></i>
                                                <span class="vote-count">${burger.voteCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ${reviews.length > 0 ? `
                                        <div class="leaderboard-reviews">
                                            <div class="reviews-scroll">
                                                ${reviews.map(review => `
                                                    <div class="review-preview">
                                                        <span class="review-text">"${review.comment.length > 60 ? review.comment.substring(0, 60) + '...' : review.comment}"</span>
                                                        <span class="review-author">- ${review.userId}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        leaderboard.innerHTML = leaderboardHTML;

        // Add click event listeners to leaderboard items
        leaderboard.querySelectorAll('.leaderboard-item').forEach(item => {
            item.addEventListener('click', () => {
                const burgerId = item.dataset.burgerId;
                this.showBurgerDetail(burgerId);
            });
        });
    }

    searchExistingBurgers(query) {
        console.log('Searching burgers for:', query);
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        const results = this.burgers.filter(burger => 
            burger.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 results

        console.log('Found burger results:', results);
        if (results.length > 0) {
            this.showBurgerSearchResults(results, query);
        } else {
            this.hideSearchResults();
        }
    }

    searchExistingRestaurants(query) {
        console.log('Searching restaurants for:', query);
        if (!query || query.length < 2) {
            this.hideRestaurantSearchResults();
            return;
        }

        const results = this.restaurants.filter(restaurant => 
            restaurant.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 results

        console.log('Found restaurant results:', results);
        if (results.length > 0) {
            this.showRestaurantSearchResults(results, query);
        } else {
            this.hideRestaurantSearchResults();
        }
    }

    showBurgerSearchResults(results, query) {
        let searchResultsContainer = document.getElementById('burger-search-results');
        if (!searchResultsContainer) {
            searchResultsContainer = document.createElement('div');
            searchResultsContainer.id = 'burger-search-results';
            searchResultsContainer.className = 'search-results';
            const formGroup = document.getElementById('burger-name').parentNode;
            formGroup.appendChild(searchResultsContainer);
            formGroup.classList.add('has-search-results');
        }

        searchResultsContainer.innerHTML = `
            <div class="search-results-header">
                <i class="fas fa-search"></i>
                Found ${results.length} existing burger${results.length > 1 ? 's' : ''}:
            </div>
            ${results.map(burger => {
                const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
                const score = this.calculateBurgerScore(burger.id);
                const voteCount = this.getVoteCount(burger.id);
                return `
                    <div class="search-result-item" data-burger-id="${burger.id}">
                        <div class="search-result-info">
                            <div class="search-result-name">${burger.name}</div>
                            <div class="search-result-restaurant">${restaurant.name}</div>
                        </div>
                        <div class="search-result-stats">
                            <span class="search-result-score">${score}%</span>
                            <span class="search-result-votes">${voteCount} votes</span>
                        </div>
                    </div>
                `;
            }).join('')}
            <div class="search-result-item create-new" onclick="window.app.createNewBurger()">
                <i class="fas fa-plus"></i>
                Create new burger: "${query}"
            </div>
        `;
        searchResultsContainer.style.display = 'block';
    }

    showRestaurantSearchResults(results, query) {
        let searchResultsContainer = document.getElementById('restaurant-search-results');
        if (!searchResultsContainer) {
            searchResultsContainer = document.createElement('div');
            searchResultsContainer.id = 'restaurant-search-results';
            searchResultsContainer.className = 'search-results';
            const formGroup = document.getElementById('restaurant-name').parentNode;
            formGroup.appendChild(searchResultsContainer);
            formGroup.classList.add('has-search-results');
        }

        searchResultsContainer.innerHTML = `
            <div class="search-results-header">
                <i class="fas fa-search"></i>
                Found ${results.length} existing restaurant${results.length > 1 ? 's' : ''}:
            </div>
            ${results.map(restaurant => {
                const burgerCount = this.burgers.filter(b => b.restaurantId === restaurant.id).length;
                return `
                    <div class="search-result-item" data-restaurant-id="${restaurant.id}">
                        <div class="search-result-info">
                            <div class="search-result-name">${restaurant.name}</div>
                            <div class="search-result-details">${restaurant.address}</div>
                        </div>
                        <div class="search-result-stats">
                            <span class="search-result-burgers">${burgerCount} burgers</span>
                        </div>
                    </div>
                `;
            }).join('')}
            <div class="search-result-item create-new" onclick="window.app.createNewRestaurant()">
                <i class="fas fa-plus"></i>
                Create new restaurant: "${query}"
            </div>
        `;
        searchResultsContainer.style.display = 'block';
    }

    hideSearchResults() {
        const container = document.getElementById('burger-search-results');
        if (container) {
            container.style.display = 'none';
            const formGroup = document.getElementById('burger-name').parentNode;
            formGroup.classList.remove('has-search-results');
        }
    }

    hideRestaurantSearchResults() {
        const container = document.getElementById('restaurant-search-results');
        if (container) {
            container.style.display = 'none';
            const formGroup = document.getElementById('restaurant-name').parentNode;
            formGroup.classList.remove('has-search-results');
        }
    }

    selectExistingBurger(burgerId) {
        const burger = this.burgers.find(b => b.id === burgerId);
        const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
        
        // Fill in the form with existing data
        document.getElementById('burger-name').value = burger.name;
        document.getElementById('restaurant-name').value = restaurant.name;
        
        // Disable the fields to prevent editing
        document.getElementById('burger-name').disabled = true;
        document.getElementById('restaurant-name').disabled = true;
        
        // Show a message
        this.showToast(`Selected existing burger: ${burger.name} at ${restaurant.name}`, 'success');
        
        // Hide search results
        this.hideSearchResults();
        this.hideRestaurantSearchResults();
    }

    selectExistingRestaurant(restaurantId) {
        const restaurant = this.restaurants.find(r => r.id === restaurantId);
        
        // Fill in the restaurant name
        document.getElementById('restaurant-name').value = restaurant.name;
        
        // Show a message
        this.showToast(`Selected existing restaurant: ${restaurant.name}`, 'success');
        
        // Hide search results
        this.hideRestaurantSearchResults();
    }

    createNewBurger() {
        // Enable the burger name field for editing
        document.getElementById('burger-name').disabled = false;
        this.showToast('Creating new burger...', 'success');
        this.hideSearchResults();
    }

    createNewRestaurant() {
        // Enable the restaurant name field for editing
        document.getElementById('restaurant-name').disabled = false;
        this.showToast('Creating new restaurant...', 'success');
        this.hideRestaurantSearchResults();
    }

    setupPhotoUpload() {
        const uploadArea = document.getElementById('photo-upload-area');
        const fileInput = document.getElementById('burger-photo');
        const preview = document.getElementById('photo-preview');
        const previewImg = document.getElementById('photo-preview-img');
        const changeBtn = document.getElementById('change-photo-btn');
        const removeBtn = document.getElementById('remove-photo-btn');

        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handlePhotoSelection(file, preview, previewImg, uploadArea);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handlePhotoSelection(file, preview, previewImg, uploadArea);
                fileInput.files = e.dataTransfer.files;
            } else {
                this.showToast('Please select a valid image file', 'error');
            }
        });

        // Change photo
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Remove photo
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removePhoto(preview, previewImg, uploadArea, fileInput);
            });
        }
    }

    handlePhotoSelection(file, preview, previewImg, uploadArea) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('File size must be less than 5MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            uploadArea.style.display = 'none';
            this.showToast('Photo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }

    removePhoto(preview, previewImg, uploadArea, fileInput) {
        preview.style.display = 'none';
        uploadArea.style.display = 'block';
        previewImg.src = '';
        fileInput.value = '';
        this.showToast('Photo removed', 'success');
    }

    loadRestaurants() {
        const container = document.getElementById('restaurants-container');
        
        // Group burgers by restaurant
        const restaurantsWithBurgers = this.restaurants.map(restaurant => {
            const burgers = this.burgers.filter(burger => burger.restaurantId === restaurant.id);
            const totalScore = burgers.reduce((sum, burger) => sum + this.calculateBurgerScore(burger.id), 0);
            const averageScore = burgers.length > 0 ? totalScore / burgers.length : 0;
            
            return {
                ...restaurant,
                burgers: burgers,
                burgerCount: burgers.length,
                averageScore: Math.round(averageScore)
            };
        });

        // Sort by number of burgers, then by average score
        restaurantsWithBurgers.sort((a, b) => {
            if (b.burgerCount !== a.burgerCount) {
                return b.burgerCount - a.burgerCount;
            }
            return b.averageScore - a.averageScore;
        });

        container.innerHTML = restaurantsWithBurgers.map(restaurant => `
            <div class="restaurant-card" onclick="app.showRestaurantDetail('${restaurant.id}')">
                <div class="restaurant-header">
                    <div class="restaurant-info">
                        <h3 class="restaurant-name">${restaurant.name}</h3>
                        <p class="restaurant-address">${restaurant.address}</p>
                    </div>
                    <div class="restaurant-stats">
                        <div class="restaurant-burger-count">
                            <i class="fas fa-hamburger"></i>
                            ${restaurant.burgerCount} burger${restaurant.burgerCount !== 1 ? 's' : ''}
                        </div>
                        <div class="restaurant-avg-score">
                            <i class="fas fa-star"></i>
                            ${restaurant.averageScore}% avg
                        </div>
                    </div>
                </div>
                <div class="restaurant-burgers">
                    ${restaurant.burgers.slice(0, 3).map(burger => {
                        const score = this.calculateBurgerScore(burger.id);
                        const voteCount = this.getVoteCount(burger.id);
                        return `
                            <div class="restaurant-burger-item">
                                <span class="burger-name">${burger.name}</span>
                                <span class="burger-score">${score}% (${voteCount} votes)</span>
                            </div>
                        `;
                    }).join('')}
                    ${restaurant.burgers.length > 3 ? `
                        <div class="restaurant-burger-more">
                            +${restaurant.burgers.length - 3} more burgers
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    showRestaurantDetail(restaurantId) {
        const restaurant = this.restaurants.find(r => r.id === restaurantId);
        const burgers = this.burgers.filter(b => b.restaurantId === restaurantId);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content restaurant-detail-modal">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-store"></i>
                        ${restaurant.name}
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="restaurant-detail-info">
                        <p><i class="fas fa-map-marker-alt"></i> ${restaurant.address}</p>
                        <p><i class="fas fa-phone"></i> ${restaurant.phone || 'No phone listed'}</p>
                        <p><i class="fas fa-hamburger"></i> ${burgers.length} burger${burgers.length !== 1 ? 's' : ''}</p>
                    </div>
                    
                    <div class="restaurant-burgers-list">
                        <h4>Burgers at ${restaurant.name}</h4>
                        ${burgers.map(burger => {
                            const score = this.calculateBurgerScore(burger.id);
                            const voteCount = this.getVoteCount(burger.id);
                            return `
                                <div class="restaurant-burger-detail" onclick="app.showBurgerDetail('${burger.id}'); this.closest('.modal').remove();">
                                    <div class="burger-info">
                                        <span class="burger-name">${burger.name}</span>
                                        <span class="burger-score">${score}%</span>
                                    </div>
                                    <div class="burger-stats">
                                        <span class="burger-votes">${voteCount} votes</span>
                                        <span class="burger-stars">${this.getStarRating(score)}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="restaurant-actions">
                        <button class="btn btn-primary" onclick="app.showNewRankForm(); this.closest('.modal').remove();">
                            <i class="fas fa-plus"></i>
                            Add Burger to ${restaurant.name}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    loadLists() {
        const container = document.getElementById('lists-grid');
        
        // For now, show a placeholder since we haven't implemented lists yet
        container.innerHTML = `
            <div class="list-card">
                <div class="list-header">
                    <div class="list-info">
                        <h3>My Favorites</h3>
                        <p class="list-description">Burgers I absolutely love</p>
                    </div>
                    <div class="list-stats">
                        0 burgers
                    </div>
                </div>
                <div class="list-burgers">
                    <div class="list-burger-item">
                        <span class="list-burger-name">No burgers yet</span>
                        <span class="list-burger-restaurant">Create your first list!</span>
                    </div>
                </div>
            </div>
            
            <div class="list-card">
                <div class="list-header">
                    <div class="list-info">
                        <h3>Want to Try</h3>
                        <p class="list-description">Burgers on my bucket list</p>
                    </div>
                    <div class="list-stats">
                        0 burgers
                    </div>
                </div>
                <div class="list-burgers">
                    <div class="list-burger-item">
                        <span class="list-burger-name">No burgers yet</span>
                        <span class="list-burger-restaurant">Start adding to your list!</span>
                    </div>
                </div>
            </div>
        `;

        // Add click handler for create list button
        document.getElementById('create-list-btn').addEventListener('click', () => {
            this.showToast('Lists feature coming soon!', 'success');
        });
    }

    showScoringExplanation() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content scoring-explanation-modal">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-calculator"></i>
                        How Our Scoring Works
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="explanation-content">
                        <div class="explanation-section">
                            <h4><i class="fas fa-trophy"></i> Top Ranked Section</h4>
                            <p>Burgers with <strong>10 or more votes</strong> are ranked using our <strong>Weighted Score</strong> system.</p>
                            <div class="example-box">
                                <h5>Why Weighted Scores?</h5>
                                <p>This prevents a new burger with just 1 perfect rating from unfairly ranking above established favorites with many high ratings.</p>
                            </div>
                        </div>

                        <div class="explanation-section">
                            <h4><i class="fas fa-fire"></i> New & Trending Section</h4>
                            <p>Burgers with <strong>fewer than 10 votes</strong> are ranked by their <strong>Raw Score</strong> (simple average).</p>
                            <div class="example-box">
                                <h5>Why Raw Scores?</h5>
                                <p>New burgers need a chance to be discovered! Raw scores show the actual user ratings without any adjustments.</p>
                            </div>
                        </div>

                        <div class="explanation-section">
                            <h4><i class="fas fa-chart-line"></i> The Math Behind It</h4>
                            <div class="formula-box">
                                <h5>Weighted Score Formula:</h5>
                                <div class="formula">
                                    <span class="formula-text">(votes ÷ (votes + 10)) × Raw Score + (10 ÷ (votes + 10)) × Global Average</span>
                                </div>
                                <p class="formula-explanation">
                                    • <strong>More votes</strong> = More weight given to the burger's actual score<br>
                                    • <strong>Fewer votes</strong> = More weight given to the global average<br>
                                    • <strong>10 votes</strong> = The "trust threshold" where we start believing the score
                                </p>
                            </div>
                        </div>

                        <div class="explanation-section">
                            <h4><i class="fas fa-lightbulb"></i> Real Example</h4>
                            <div class="example-comparison">
                                <div class="example-item">
                                    <h5>🍔 New Burger</h5>
                                    <p>1 vote, 100% rating</p>
                                    <p><strong>Weighted Score:</strong> ~68%</p>
                                    <p class="example-note">Shows in "New & Trending"</p>
                                </div>
                                <div class="example-item">
                                    <h5>🏆 Established Burger</h5>
                                    <p>100 votes, 95% rating</p>
                                    <p><strong>Weighted Score:</strong> ~92%</p>
                                    <p class="example-note">Shows in "Top Ranked"</p>
                                </div>
                            </div>
                        </div>

                        <div class="explanation-footer">
                            <p><i class="fas fa-shield-alt"></i> This system ensures fair rankings that reward both quality and community trust!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Profile
    loadProfile() {
        if (!this.currentUser) return;

        document.getElementById('profile-username').textContent = this.currentUser.userId;
        document.getElementById('profile-email').textContent = this.currentUser.email;

        // Calculate stats
        const userRanks = this.ranks.filter(rank => rank.userId === this.currentUser.id);
        const uniqueBurgers = new Set(userRanks.map(rank => rank.burgerId));

        document.getElementById('stats-ratings').textContent = userRanks.length;
        document.getElementById('stats-lists').textContent = this.currentUser.savedLists.length;
        document.getElementById('stats-burgers').textContent = uniqueBurgers.size;

        // Load user's recent ratings
        this.loadUserRatings();
    }

    loadUserRatings() {
        if (!this.currentUser) return;

        const userRanks = this.ranks
            .filter(rank => rank.userId === this.currentUser.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Show last 10 ratings

        const ratingsContainer = document.getElementById('user-ratings');
        if (!ratingsContainer) return;

        if (userRanks.length === 0) {
            ratingsContainer.innerHTML = `
                <div class="text-center" style="color: #666; padding: 2rem;">
                    <i class="fas fa-star" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>You haven't rated any burgers yet.</p>
                    <button class="btn btn-primary" onclick="app.showNewRankForm()">Rate Your First Burger</button>
                </div>
            `;
            return;
        }

        ratingsContainer.innerHTML = userRanks.map(rank => {
            const burger = this.burgers.find(b => b.id === rank.burgerId);
            const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
            const score = this.calculateBurgerScore(burger.id);
            
            return `
                <div class="user-rating-item">
                    <div class="rating-burger-info">
                        <div class="rating-burger-name">${burger.name}</div>
                        <div class="rating-restaurant-name">${restaurant.name}</div>
                    </div>
                    <div class="rating-score">
                        <span class="rating-emoji">${this.getRatingEmoji(rank.score)}</span>
                        <span class="rating-percentage">${this.scoreToPercentage(rank.score)}%</span>
                    </div>
                    <div class="rating-date">${new Date(rank.date).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');
    }

    getRatingEmoji(score) {
        const emojis = ['😞', '😐', '😊', '😋', '🤤'];
        return emojis[score + 2]; // Convert -2 to +2 to 0-4 index
    }

    scoreToPercentage(score) {
        return Math.round(((score + 2) / 4) * 100);
    }

    getVoteCount(burgerId) {
        return this.ranks.filter(rank => rank.burgerId === burgerId).length;
    }

    // Burger Detail
    showBurgerDetail(burgerId) {
        try {
            console.log('showBurgerDetail called with:', burgerId);
            
            // Store the current burger ID
            this.currentBurgerId = burgerId;
            
            const burger = this.burgers.find(b => b.id === burgerId);
            if (!burger) {
                this.showToast('Burger not found', 'error');
                return;
            }
            
            const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
            if (!restaurant) {
                this.showToast('Restaurant not found', 'error');
                return;
            }
            
            const score = this.calculateBurgerScore(burgerId);
            const ranking = this.getBurgerRanking(burgerId);
            const burgerRanks = this.ranks.filter(rank => rank.burgerId === burgerId);

            // Update detail screen
            const detailElements = {
                'detail-burger-name': burger.name,
                'detail-restaurant-name': restaurant.name,
                'detail-rating-score': `${score}%`,
                'detail-total-ratings': burgerRanks.length,
                'detail-avg-score': `${score}%`,
                'detail-ranking': `#${ranking}`
            };

            // Safely update each element
            Object.entries(detailElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });

            // Update stars
            const starsElement = document.getElementById('detail-rating-stars');
            if (starsElement) {
                starsElement.innerHTML = this.getStarRating(score);
            }

            // Update restaurant information with new functionality
            this.updateRestaurantDetailDisplay(restaurant);

            // Update image
            const imageElement = document.getElementById('detail-burger-image');
            if (imageElement) {
                if (burger.imageUrl) {
                    imageElement.src = burger.imageUrl;
                    imageElement.style.display = 'block';
                } else {
                    imageElement.style.display = 'none';
                }
            }

            // Load reviews
            this.loadReviews(burgerId);

            this.showScreen('detail');
            
            // Set up event listeners for detail screen buttons
            this.setupDetailScreenListeners();
        } catch (error) {
            console.error('Error in showBurgerDetail:', error);
            this.showToast('Error loading burger details', 'error');
        }
    }

    setupDetailScreenListeners() {
        console.log('Setting up detail screen listeners');
        
        // Back button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                console.log('Back button clicked (direct)');
                this.showScreen('home');
            };
        }
        
        // Detail action buttons
        const detailButtons = {
            'detail-rank-btn': () => {
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) {
                    this.showRankFormForExistingBurger(burgerId);
                } else {
                    this.showScreen('rank');
                }
            },
            'detail-photo-btn': () => {
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) {
                    const photoInput = document.getElementById('burger-photo-upload');
                    if (photoInput) {
                        photoInput.click();
                    }
                }
            },
            'detail-data-btn': () => {
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.showDataModal(burgerId);
            },
            'detail-edit-btn': () => {
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.showEditBurgerModal(burgerId);
            },
            'detail-delete-btn': () => {
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.deleteBurger(burgerId);
            }
        };
        
        Object.entries(detailButtons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.onclick = handler;
                console.log(`Set up listener for ${id}`);
            } else {
                console.log(`Button ${id} not found`);
            }
        });
    }

    loadReviews(burgerId) {
        const reviewsList = document.getElementById('reviews-list');
        const burgerRanks = this.ranks.filter(rank => rank.burgerId === burgerId);

        if (burgerRanks.length === 0) {
            reviewsList.innerHTML = '<p style="text-align: center; color: #666;">No reviews yet. Be the first to review!</p>';
            return;
        }

        reviewsList.innerHTML = burgerRanks.map(rank => {
            const user = this.users.find(u => u.id === rank.userId);
            const date = new Date(rank.date).toLocaleDateString();
            const stars = this.getStarRating((rank.score + 2) / 4 * 100);

            return `
                <div class="review-item" data-rank-id="${rank.id}">
                    <div class="review-header">
                        <div class="review-user-section">
                            <span class="review-user">${user ? user.userId : 'Anonymous'}</span>
                            <button class="delete-review-btn" data-rank-id="${rank.id}" title="Delete this review">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-rating">${stars}</div>
                    ${rank.comment ? `<div class="review-comment">${rank.comment}</div>` : ''}
                </div>
            `;
        }).join('');

        // Add event listeners for delete buttons
        reviewsList.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rankId = btn.dataset.rankId;
                this.deleteReview(rankId, burgerId);
            });
        });
    }

    // Data Modal
    showDataModal(burgerId) {
        const burgerRanks = this.ranks.filter(rank => rank.burgerId === burgerId);
        const breakdown = {
            excellent: burgerRanks.filter(r => r.score === 2).length,
            good: burgerRanks.filter(r => r.score === 1).length,
            average: burgerRanks.filter(r => r.score === 0).length,
            poor: burgerRanks.filter(r => r.score === -1).length,
            veryPoor: burgerRanks.filter(r => r.score === -2).length
        };

        const total = burgerRanks.length;

        // Update breakdown bars
        Object.keys(breakdown).forEach(key => {
            const percentage = total > 0 ? (breakdown[key] / total) * 100 : 0;
            document.getElementById(`${key}-bar`).style.width = `${percentage}%`;
            document.getElementById(`${key}-count`).textContent = breakdown[key];
        });

        document.getElementById('data-modal').style.display = 'block';
    }

    deleteReview(rankId, burgerId) {
        const rank = this.ranks.find(r => r.id === rankId);
        if (!rank) {
            this.showToast('Review not found', 'error');
            return;
        }

        const user = this.users.find(u => u.id === rank.userId);
        const userName = user ? user.userId : 'Anonymous';

        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete the review by "${userName}"?\n\nThis action cannot be undone.`);
        
        if (!confirmed) {
            return;
        }

        // Remove the rank
        this.ranks = this.ranks.filter(r => r.id !== rankId);
        
        // Save the updated data
        this.saveData();
        
        // Show success message
        this.showToast(`Review by "${userName}" has been deleted`, 'success');
        
        // Refresh the reviews list
        this.loadReviews(burgerId);
        
        // Update the burger detail stats
        this.showBurgerDetail(burgerId);
        
        // Update the leaderboard if we're on the home screen
        if (this.currentScreen === 'home') {
            this.loadLeaderboard();
        }
    }

    // Calculate distance between two ZIP codes (approximate)
    calculateDistance(zip1, zip2) {
        // For now, we'll use a simple approximation based on ZIP code ranges
        // In a real app, you'd use a geocoding service or ZIP code database
        
        // Convert ZIP codes to numbers for comparison
        const zip1Num = parseInt(zip1);
        const zip2Num = parseInt(zip2);
        
        if (isNaN(zip1Num) || isNaN(zip2Num)) {
            return Infinity; // Can't calculate distance
        }
        
        // Simple approximation: each ZIP code range represents roughly 1-2 miles
        // This is a very rough estimate and should be replaced with real geocoding
        const difference = Math.abs(zip1Num - zip2Num);
        
        // For Chicago area (606xx), we'll use a more specific calculation
        if (zip1Num >= 60600 && zip1Num <= 60699) {
            if (zip2Num >= 60600 && zip2Num <= 60699) {
                // Within Chicago area - roughly 0.5 miles per ZIP difference
                return difference * 0.5;
            } else {
                // Outside Chicago area - very far
                return 1000; // Very far away
            }
        }
        
        // For other areas, use a rough estimate
        return difference * 2;
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getStarRating(percentage) {
        const maxStars = 5;
        const normalizedRating = Math.max(0, Math.min(maxStars, percentage / 20));
        const fullStars = Math.floor(normalizedRating);
        const hasHalfStar = normalizedRating % 1 >= 0.5;
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        return stars;
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Event Listeners
    setupEventListeners() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                console.log('Login form submitted');
                this.login(email, password);
            } catch (error) {
                console.error('Login form error:', error);
                this.showToast('Login failed. Please try again.', 'error');
            }
        });

        // Signup form
        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const userId = document.getElementById('signup-userid').value;
                const email = document.getElementById('signup-email').value;
                const phone = document.getElementById('signup-phone').value;
                const password = document.getElementById('signup-password').value;
                console.log('Signup form submitted');
                this.signup(userId, email, phone, password);
            } catch (error) {
                console.error('Signup form error:', error);
                this.showToast('Signup failed. Please try again.', 'error');
            }
        });

        // Navigation (only if elements exist)
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showScreen('profile'));
        }

        const myListsBtn = document.getElementById('my-lists-btn');
        if (myListsBtn) {
            myListsBtn.addEventListener('click', () => this.showScreen('lists'));
        }

        const restaurantsBtn = document.getElementById('restaurants-btn');
        if (restaurantsBtn) {
            restaurantsBtn.addEventListener('click', () => this.showScreen('restaurants'));
        }

        const mapBtn = document.getElementById('map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => this.showScreen('map'));
        }

        const rankBurgerBtn = document.getElementById('rank-burger-btn');
        if (rankBurgerBtn) {
            rankBurgerBtn.addEventListener('click', () => this.showNewRankForm());
        }

        // Search (only if elements exist)
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Search on Enter key (only if element exists)
        const zipInput = document.getElementById('zip-input');
        if (zipInput) {
            zipInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // Show all burgers (only if element exists)
        const showAllBtn = document.getElementById('show-all-btn');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                this.currentLocation = null;
                this.searchRadius = null;
                // If we're on the rank screen, go back to home first
                const rankScreen = document.getElementById('rank-screen');
                if (rankScreen && rankScreen.classList.contains('active')) {
                    this.showScreen('home');
                }
                this.loadLeaderboard();
                this.showToast('Showing all burgers', 'success');
            });
        }

        // Recovery shortcut: Ctrl+Shift+R to restore from backup (safe)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                this.attemptDataRecovery();
            }
        });

        // Radius controls (only if elements exist)
        const radiusMinus = document.getElementById('radius-minus');
        const radiusPlus = document.getElementById('radius-plus');
        const radiusInput = document.getElementById('radius-input');
        
        if (radiusMinus) {
            radiusMinus.addEventListener('click', () => {
                const input = document.getElementById('radius-input');
                if (input) {
                    const currentValue = parseInt(input.value);
                    if (currentValue > 1) {
                        input.value = currentValue - 1;
                    }
                }
            });
        }

        if (radiusPlus) {
            radiusPlus.addEventListener('click', () => {
                const input = document.getElementById('radius-input');
                if (input) {
                    const currentValue = parseInt(input.value);
                    if (currentValue < 100) {
                        input.value = currentValue + 1;
                    }
                }
            });
        }

        if (radiusInput) {
            radiusInput.addEventListener('change', () => {
                const input = document.getElementById('radius-input');
                if (input) {
                    let value = parseInt(input.value);
                    if (isNaN(value) || value < 1) {
                        value = 1;
                    } else if (value > 100) {
                        value = 100;
                    }
                    input.value = value;
                }
            });
        }

        // Rank form (only if element exists)
        const rankForm = document.getElementById('rank-form');
        if (rankForm) {
            rankForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const burgerName = document.getElementById('burger-name')?.value || '';
                const restaurantName = document.getElementById('restaurant-name')?.value || '';
                const rating = document.querySelector('.rating-option.selected')?.dataset.rating;
                const comment = document.getElementById('burger-comment')?.value || '';
                const photoFile = document.getElementById('burger-photo')?.files[0];

                if (!rating) {
                    this.showToast('Please select a rating', 'error');
                    return;
                }

                this.submitRank(burgerName, restaurantName, rating, comment, photoFile);
            });
        }

        // Rating options (only if elements exist)
        const ratingOptions = document.querySelectorAll('.rating-option');
        if (ratingOptions.length > 0) {
            ratingOptions.forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.rating-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
        }

        // Cancel rank (only if element exists)
        const cancelRank = document.getElementById('cancel-rank');
        if (cancelRank) {
            cancelRank.addEventListener('click', () => this.showScreen('home'));
        }

        // Live search for existing burgers (only if element exists)
        const burgerNameInput = document.getElementById('burger-name');
        if (burgerNameInput) {
            burgerNameInput.addEventListener('input', (e) => {
                this.searchExistingBurgers(e.target.value);
            });
        }

        // Live search for existing restaurants (only if element exists)
        const restaurantNameInput = document.getElementById('restaurant-name');
        if (restaurantNameInput) {
            restaurantNameInput.addEventListener('input', (e) => {
                this.searchExistingRestaurants(e.target.value);
            });
        }

        // Add event delegation for search result clicks
        document.addEventListener('click', (e) => {
            // Handle burger search result clicks
            if (e.target.closest('#burger-search-results .search-result-item')) {
                const burgerId = e.target.closest('.search-result-item').dataset.burgerId;
                if (burgerId) {
                    this.selectExistingBurger(burgerId);
                }
            }

            // Handle restaurant search result clicks
            if (e.target.closest('#restaurant-search-results .search-result-item')) {
                const restaurantId = e.target.closest('.search-result-item').dataset.restaurantId;
                if (restaurantId) {
                    this.selectExistingRestaurant(restaurantId);
                }
            }
        });

        // Enhanced photo upload functionality
        this.setupPhotoUpload();

        // Logo click to go home (only if element exists)
        const homeLogo = document.getElementById('home-logo');
        if (homeLogo) {
            homeLogo.addEventListener('click', () => {
                this.showScreen('home');
            });
        }

        // Search overlay functionality
        const searchToggleBtn = document.getElementById('search-toggle-btn');
        const searchOverlay = document.getElementById('search-overlay');
        const searchCloseBtn = document.getElementById('search-close-btn');
        const overlaySearchInput = document.getElementById('overlay-search-input');
        const searchClearBtn = document.getElementById('search-clear-btn');
        const searchTabs = document.querySelectorAll('.search-tab');

        if (searchToggleBtn) {
            searchToggleBtn.addEventListener('click', () => {
                this.openSearchOverlay();
            });
        }

        if (searchCloseBtn) {
            searchCloseBtn.addEventListener('click', () => {
                this.closeSearchOverlay();
            });
        }

        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    this.closeSearchOverlay();
                }
            });
        }

        if (overlaySearchInput) {
            overlaySearchInput.addEventListener('input', (e) => {
                this.performOverlaySearch(e.target.value);
            });

            overlaySearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeSearchOverlay();
                }
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                this.clearOverlaySearch();
            });
        }

        // Search tabs (removed - now unified search)

        // Leaderboard toggle buttons
        const topRankedBtn = document.getElementById('top-ranked-btn');
        const newTrendingBtn = document.getElementById('new-trending-btn');

        if (topRankedBtn) {
            topRankedBtn.addEventListener('click', () => {
                this.switchLeaderboardSection('top-ranked');
            });
        }

        if (newTrendingBtn) {
            newTrendingBtn.addEventListener('click', () => {
                this.switchLeaderboardSection('new-trending');
            });
        }

        // Detail actions - using event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            console.log('Click event on:', e.target);
            
            // Back button
            if (e.target.closest('.back-btn')) {
                console.log('Back button clicked');
                this.showScreen('home');
                return;
            }
            
            // Detail rank button
            if (e.target.closest('#detail-rank-btn')) {
                console.log('Detail rank button clicked');
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) {
                    this.showRankFormForExistingBurger(burgerId);
                } else {
                    this.showScreen('rank');
                }
                return;
            }
            
            // Detail photo button
            if (e.target.closest('#detail-photo-btn')) {
                console.log('Detail photo button clicked');
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) {
                    const photoInput = document.getElementById('burger-photo-upload');
                    if (photoInput) {
                        photoInput.click();
                    } else {
                        console.error('Photo input not found');
                    }
                }
                return;
            }
            
            // Detail data button
            if (e.target.closest('#detail-data-btn')) {
                console.log('Detail data button clicked');
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.showDataModal(burgerId);
                return;
            }
            
            // Detail delete button
            if (e.target.closest('#detail-delete-btn')) {
                console.log('Detail delete button clicked');
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.deleteBurger(burgerId);
                return;
            }
            
            // Detail edit button
            if (e.target.closest('#detail-edit-btn')) {
                console.log('Detail edit button clicked');
                const burgerId = this.getCurrentBurgerId();
                if (burgerId) this.showEditBurgerModal(burgerId);
                return;
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Photo upload
        document.addEventListener('change', (e) => {
            if (e.target.id === 'burger-photo-upload') {
                const file = e.target.files[0];
                if (file) {
                    const burgerId = this.getCurrentBurgerId();
                    if (burgerId) {
                        this.updateBurgerPhoto(burgerId, file);
                    }
                }
                // Reset the input
                e.target.value = '';
            }
        });

        // Modal close and form handling - using event delegation
        document.addEventListener('click', (e) => {
            // Modal close buttons
            if (e.target.classList.contains('close')) {
                e.target.closest('.modal').style.display = 'none';
                return;
            }
            
            // Cancel edit button
            if (e.target.closest('#cancel-edit')) {
                document.getElementById('edit-burger-modal').style.display = 'none';
                return;
            }
            
            // Close modal on outside click
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                return;
            }
        });

        // Edit burger form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'edit-burger-form') {
                e.preventDefault();
                this.saveBurgerEdit();
            }
        });

        // Toggle restaurant details
        document.getElementById('toggle-restaurant-details').addEventListener('click', () => {
            this.toggleRestaurantDetails();
        });
    }

    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-form`).classList.add('active');
    }

    getCurrentBurgerId() {
        return this.currentBurgerId;
    }

    showRankFormForExistingBurger(burgerId) {
        const burger = this.burgers.find(b => b.id === burgerId);
        const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
        
        if (!burger || !restaurant) {
            this.showToast('Burger not found', 'error');
            return;
        }

        // Pre-fill the form with existing burger info
        document.getElementById('burger-name').value = burger.name;
        document.getElementById('restaurant-name').value = restaurant.name;
        
        // Disable the burger name and restaurant fields since we're ranking an existing burger
        document.getElementById('burger-name').disabled = true;
        document.getElementById('restaurant-name').disabled = true;
        
        // Clear any previous rating selection
        document.querySelectorAll('.rating-option').forEach(opt => opt.classList.remove('selected'));
        
        // Clear comment and photo
        document.getElementById('burger-comment').value = '';
        document.getElementById('burger-photo').value = '';
        
        // Store the burger ID for the ranking submission
        this.currentRankingBurgerId = burgerId;
        
        // Show the rank screen
        this.showScreen('rank');
        
        // Update the form title to indicate we're ranking an existing burger
        const rankTitle = document.querySelector('#rank-screen h2');
        if (rankTitle) {
            rankTitle.textContent = `Rank ${burger.name}`;
        }
    }

    showNewRankForm() {
        try {
            console.log('Show new rank form called, current user:', this.currentUser);
            
            // Check if user is logged in
            if (!this.currentUser) {
                console.log('No current user, redirecting to auth');
                this.showToast('Please log in to rank a burger', 'error');
                this.showAuthScreen();
                return;
            }

            // Clear the form
            document.getElementById('burger-name').value = '';
            document.getElementById('restaurant-name').value = '';
            
            // Enable the burger name and restaurant fields
            document.getElementById('burger-name').disabled = false;
            document.getElementById('restaurant-name').disabled = false;
        
        // Clear any previous rating selection
        document.querySelectorAll('.rating-option').forEach(opt => opt.classList.remove('selected'));
        
        // Clear comment and photo
        document.getElementById('burger-comment').value = '';
        document.getElementById('burger-photo').value = '';
        
        // Clear restaurant details form
        document.getElementById('restaurant-details-form').style.display = 'none';
        document.getElementById('toggle-restaurant-details').classList.remove('expanded');
        document.getElementById('toggle-restaurant-details').innerHTML = '<i class="fas fa-plus"></i> Add Restaurant Details';
        
        // Clear restaurant details fields
        document.getElementById('restaurant-address').value = '';
        document.getElementById('restaurant-phone').value = '';
        document.getElementById('restaurant-website').value = '';
        document.getElementById('restaurant-instagram').value = '';
        document.getElementById('restaurant-doordash').value = '';
        document.getElementById('restaurant-opentable').value = '';
        
        // Clear the current ranking burger ID
        this.currentRankingBurgerId = null;
        
        // Reset the form title
        const rankTitle = document.querySelector('#rank-screen h2');
        if (rankTitle) {
            rankTitle.textContent = 'Rank a Burger';
        }
        
        // Show the rank screen
        this.showScreen('rank');
        } catch (error) {
            console.error('Error showing new rank form:', error);
            this.showToast('Error loading rank form. Please try again.', 'error');
        }
    }

    toggleRestaurantDetails() {
        const form = document.getElementById('restaurant-details-form');
        const button = document.getElementById('toggle-restaurant-details');
        const isVisible = form.style.display !== 'none';
        
        if (isVisible) {
            form.style.display = 'none';
            button.classList.remove('expanded');
            button.innerHTML = '<i class="fas fa-plus"></i> Add Restaurant Details';
        } else {
            form.style.display = 'block';
            button.classList.add('expanded');
            button.innerHTML = '<i class="fas fa-minus"></i> Hide Restaurant Details';
        }
    }

    updateBurgerPhoto(burgerId, file) {
        const burger = this.burgers.find(b => b.id === burgerId);
        if (!burger) {
            this.showToast('Burger not found', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image must be smaller than 5MB', 'error');
            return;
        }

        // Convert image to base64 for permanent storage
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            
            // Update the burger's image URL with base64 data
            burger.imageUrl = base64Image;
            
            // Save the updated data
            this.saveData();
            
            // Update the display
            const detailImage = document.getElementById('detail-burger-image');
            if (detailImage) {
                detailImage.src = base64Image;
                detailImage.style.display = 'block';
            }
            
            // Update the leaderboard if we're on the home screen
            if (this.currentScreen === 'home') {
                this.loadLeaderboard();
            }
            
            this.showToast('Burger photo updated successfully!', 'success');
        };
        
        reader.readAsDataURL(file);
    }

    deleteBurger(burgerId) {
        const burger = this.burgers.find(b => b.id === burgerId);
        if (!burger) {
            this.showToast('Burger not found', 'error');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete "${burger.name}"?\n\nThis will also remove all ratings for this burger. This action cannot be undone.`);
        
        if (!confirmed) {
            return;
        }

        // Remove all ratings for this burger
        this.ranks = this.ranks.filter(rank => rank.burgerId !== burgerId);
        
        // Remove the burger
        this.burgers = this.burgers.filter(b => b.id !== burgerId);
        
        // Save the updated data
        this.saveData();
        
        // Show success message
        this.showToast(`"${burger.name}" has been deleted successfully`, 'success');
        
        // Return to home screen and refresh leaderboard
        this.showScreen('home');
        this.loadLeaderboard();
    }

    showEditBurgerModal(burgerId) {
        const burger = this.burgers.find(b => b.id === burgerId);
        const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
        
        if (!burger || !restaurant) {
            this.showToast('Burger not found', 'error');
            return;
        }

        // Store the current burger ID for editing
        this.currentEditingBurgerId = burgerId;

        // Populate the form with current data
        document.getElementById('edit-burger-name').value = burger.name;
        document.getElementById('edit-restaurant-name').value = restaurant.name;
        document.getElementById('edit-restaurant-address').value = restaurant.address;
        document.getElementById('edit-restaurant-phone').value = restaurant.phone || '';
        document.getElementById('edit-restaurant-website').value = restaurant.website || '';
        document.getElementById('edit-restaurant-instagram').value = restaurant.instagram || '';
        document.getElementById('edit-restaurant-doordash').value = restaurant.doordash || '';
        document.getElementById('edit-restaurant-opentable').value = restaurant.reservationUrl || '';

        // Show the modal
        document.getElementById('edit-burger-modal').style.display = 'block';
    }

    saveBurgerEdit() {
        const burgerId = this.currentEditingBurgerId;
        if (!burgerId) {
            this.showToast('No burger selected for editing', 'error');
            return;
        }

        const burger = this.burgers.find(b => b.id === burgerId);
        const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
        
        if (!burger || !restaurant) {
            this.showToast('Burger not found', 'error');
            return;
        }

        // Get form values
        const burgerName = document.getElementById('edit-burger-name').value.trim();
        const restaurantName = document.getElementById('edit-restaurant-name').value.trim();
        const address = document.getElementById('edit-restaurant-address').value.trim();
        const phone = document.getElementById('edit-restaurant-phone').value.trim();
        const website = document.getElementById('edit-restaurant-website').value.trim();
        const instagram = document.getElementById('edit-restaurant-instagram').value.trim();
        const doordash = document.getElementById('edit-restaurant-doordash').value.trim();
        const opentable = document.getElementById('edit-restaurant-opentable').value.trim();

        // Validate required fields
        if (!burgerName || !restaurantName || !address) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        // Update burger
        burger.name = burgerName;

        // Update restaurant
        restaurant.name = restaurantName;
        restaurant.address = address;
        restaurant.phone = phone;
        restaurant.website = website;
        restaurant.instagram = instagram;
        restaurant.doordash = doordash;
        restaurant.reservationUrl = opentable;

        // Save changes
        this.saveData();

        // Clear the editing burger ID
        this.currentEditingBurgerId = null;

        // Close modal
        document.getElementById('edit-burger-modal').style.display = 'none';

        // Show success message
        this.showToast('Burger updated successfully!', 'success');

        // Refresh the current view
        if (this.currentScreen === 'detail-screen') {
            this.showBurgerDetail(burgerId);
        } else {
            this.loadLeaderboard();
        }
    }

    updateRestaurantDetailDisplay(restaurant) {
        try {
            // Address with Google Maps integration
            const addressItem = document.getElementById('address-item');
            const addressSpan = document.getElementById('detail-address');
            
            if (addressItem && addressSpan) {
                if (restaurant.address) {
                    addressSpan.innerHTML = `<a href="https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}" target="_blank">${restaurant.address} <i class="fas fa-external-link-alt"></i></a>`;
                    addressItem.classList.add('has-data');
                } else {
                    addressSpan.textContent = 'No address available';
                    addressItem.classList.remove('has-data');
                }
            }

            // Phone
            const phoneItem = document.getElementById('phone-item');
            const phoneSpan = document.getElementById('detail-phone');
            
            if (phoneItem && phoneSpan) {
                if (restaurant.phone) {
                    phoneSpan.innerHTML = `<a href="tel:${restaurant.phone}">${restaurant.phone}</a>`;
                    phoneItem.classList.add('has-data');
                } else {
                    phoneSpan.textContent = 'No phone available';
                    phoneItem.classList.remove('has-data');
                }
            }

            // Website
            const websiteItem = document.getElementById('website-item');
            const websiteSpan = document.getElementById('detail-website');
            
            if (websiteItem && websiteSpan) {
                if (restaurant.website) {
                    websiteSpan.innerHTML = `<a href="${restaurant.website}" target="_blank">Visit Website <i class="fas fa-external-link-alt"></i></a>`;
                    websiteItem.classList.add('has-data');
                } else {
                    websiteSpan.textContent = 'No website available';
                    websiteItem.classList.remove('has-data');
                }
            }

            // Instagram
            const instagramItem = document.getElementById('instagram-item');
            const instagramSpan = document.getElementById('detail-instagram');
            
            if (instagramItem && instagramSpan) {
                if (restaurant.instagram) {
                    instagramSpan.innerHTML = `<a href="${restaurant.instagram}" target="_blank">Follow on Instagram <i class="fab fa-instagram"></i></a>`;
                    instagramItem.classList.add('has-data');
                } else {
                    instagramSpan.textContent = 'No Instagram available';
                    instagramItem.classList.remove('has-data');
                }
            }

            // DoorDash
            const doordashLink = document.getElementById('detail-doordash');
            const addDoordashBtn = document.getElementById('add-doordash-btn');
            
            if (doordashLink && addDoordashBtn) {
                if (restaurant.doordash) {
                    doordashLink.href = restaurant.doordash;
                    doordashLink.style.display = 'inline-flex';
                    addDoordashBtn.style.display = 'none';
                } else {
                    doordashLink.style.display = 'none';
                    addDoordashBtn.style.display = 'inline-flex';
                }
            }

            // OpenTable
            const opentableLink = document.getElementById('detail-opentable');
            const addOpentableBtn = document.getElementById('add-opentable-btn');
            
            if (opentableLink && addOpentableBtn) {
                if (restaurant.opentable) {
                    opentableLink.href = restaurant.opentable;
                    opentableLink.style.display = 'inline-flex';
                    addOpentableBtn.style.display = 'none';
                } else {
                    opentableLink.style.display = 'none';
                    addOpentableBtn.style.display = 'inline-flex';
                }
            }
        } catch (error) {
            console.error('Error updating restaurant detail display:', error);
        }
    }

    addRestaurantData(dataType) {
        try {
            const burgerId = this.getCurrentBurgerId();
            if (!burgerId) {
                this.showToast('No burger selected', 'error');
                return;
            }
            
            const burger = this.burgers.find(b => b.id === burgerId);
            const restaurant = this.restaurants.find(r => r.id === burger.restaurantId);
            
            if (!burger || !restaurant) {
                this.showToast('Burger not found', 'error');
                return;
            }

            // Show edit modal and focus on the specific field
            this.showEditBurgerModal(burgerId);
            
            // Focus on the appropriate field based on dataType
            setTimeout(() => {
                const fieldMap = {
                    'address': 'edit-restaurant-address',
                    'phone': 'edit-restaurant-phone',
                    'website': 'edit-restaurant-website',
                    'instagram': 'edit-restaurant-instagram',
                    'doordash': 'edit-restaurant-doordash',
                    'opentable': 'edit-restaurant-opentable'
                };
                
                const fieldId = fieldMap[dataType];
                if (fieldId) {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.focus();
                        field.select();
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error in addRestaurantData:', error);
            this.showToast('An error occurred', 'error');
        }
    }

    // Search Overlay Methods
    openSearchOverlay() {
        const overlay = document.getElementById('search-overlay');
        if (overlay) {
            overlay.classList.add('active');
            const input = document.getElementById('overlay-search-input');
            if (input) {
                input.focus();
            }
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    closeSearchOverlay() {
        const overlay = document.getElementById('search-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            const input = document.getElementById('overlay-search-input');
            if (input) {
                input.value = '';
            }
            this.clearOverlaySearchResults();
            // Restore body scroll
            document.body.style.overflow = '';
        }
    }

    performOverlaySearch(query) {
        if (!query || query.length < 2) {
            this.clearOverlaySearchResults();
            return;
        }

        // Search both burgers and restaurants
        const burgerResults = this.burgers.filter(burger => 
            burger.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        const restaurantResults = this.restaurants.filter(restaurant => 
            restaurant.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        this.displayOverlaySearchResults(burgerResults, restaurantResults, query);
    }

    displayOverlaySearchResults(burgerResults, restaurantResults, query) {
        const container = document.getElementById('overlay-search-results');
        if (!container) return;

        const totalResults = burgerResults.length + restaurantResults.length;

        if (totalResults === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.7);">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>No results found for "${query}"</p>
                </div>
            `;
            return;
        }

        let resultsHtml = '';

        // Add burger results
        if (burgerResults.length > 0) {
            resultsHtml += `
                <div style="padding: 0.5rem 1rem; background: rgba(255, 107, 53, 0.1); color: #ff6b35; font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fas fa-hamburger"></i> Burgers (${burgerResults.length})
                </div>
            `;
            
            burgerResults.forEach(item => {
                const restaurant = this.restaurants.find(r => r.id === item.restaurantId);
                const score = this.calculateBurgerScore(item.id);
                const voteCount = this.getVoteCount(item.id);
                resultsHtml += `
                    <div class="search-result-item" onclick="window.app.selectOverlayBurger('${item.id}')">
                        <img src="${item.photo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRkY2QjM1Ii8+CjxwYXRoIGQ9Ik0xNSAxNUgzNVYzNUgxNVYxNVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${item.name}">
                        <div class="search-result-info">
                            <div class="search-result-name">${item.name}</div>
                            <div class="search-result-details">${restaurant ? restaurant.name : 'Unknown Restaurant'}</div>
                        </div>
                        <div class="search-result-stats">
                            <div>${score}%</div>
                            <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7);">${voteCount} votes</div>
                        </div>
                    </div>
                `;
            });
        }

        // Add restaurant results
        if (restaurantResults.length > 0) {
            resultsHtml += `
                <div style="padding: 0.5rem 1rem; background: rgba(255, 107, 53, 0.1); color: #ff6b35; font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fas fa-store"></i> Restaurants (${restaurantResults.length})
                </div>
            `;
            
            restaurantResults.forEach(item => {
                const burgerCount = this.burgers.filter(b => b.restaurantId === item.id).length;
                resultsHtml += `
                    <div class="search-result-item" onclick="window.app.selectOverlayRestaurant('${item.id}')">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRkY2QjM1Ii8+CjxwYXRoIGQ9Ik0xNSAxNUgzNVYzNUgxNVYxNVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=" alt="${item.name}">
                        <div class="search-result-info">
                            <div class="search-result-name">${item.name}</div>
                            <div class="search-result-details">${item.address || 'No address'}</div>
                        </div>
                        <div class="search-result-stats">
                            <div>${burgerCount} burgers</div>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = resultsHtml;
    }

    selectOverlayBurger(burgerId) {
        this.closeSearchOverlay();
        this.showBurgerDetail(burgerId);
    }

    selectOverlayRestaurant(restaurantId) {
        this.closeSearchOverlay();
        this.showRestaurantDetail(restaurantId);
    }

    clearOverlaySearch() {
        const input = document.getElementById('overlay-search-input');
        if (input) {
            input.value = '';
        }
        this.clearOverlaySearchResults();
    }

    clearOverlaySearchResults() {
        const container = document.getElementById('overlay-search-results');
        if (container) {
            container.innerHTML = '';
        }
    }

    switchLeaderboardSection(section) {
        // Update active button
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Store the current section preference
        this.currentLeaderboardSection = section;

        // Reload the leaderboard with the selected dataset
        this.loadLeaderboard();
    }
}

// Initialize the app
let app;

// Global error handler to prevent crashes
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    // Don't show toast for every error, just log it
    // This prevents the app from breaking on minor errors
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show toast for every rejection, just log it
    // This prevents the app from breaking on minor errors
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, creating app...');
        app = new BurgerRank();
        
        // Fallback: if still on loading screen after 3 seconds, force auth screen
        setTimeout(() => {
            console.log('Checking app state...');
            if (app && app.currentScreen === 'loading') {
                console.log('Fallback: forcing auth screen');
                app.showAuthScreen();
            } else if (!app) {
                console.log('App not created, showing auth screen');
                const loadingScreen = document.getElementById('loading-screen');
                const authScreen = document.getElementById('auth-screen');
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (authScreen) authScreen.style.display = 'flex';
            }
        }, 3000);
    } catch (error) {
        console.error('Error creating app:', error);
        // Show auth screen as fallback
        const loadingScreen = document.getElementById('loading-screen');
        const authScreen = document.getElementById('auth-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (authScreen) authScreen.style.display = 'flex';
    }
});

// Make addRestaurantData globally accessible
window.addRestaurantData = function(dataType) {
    try {
        if (app && typeof app.addRestaurantData === 'function') {
            app.addRestaurantData(dataType);
        } else {
            console.error('App not initialized or method not available');
        }
    } catch (error) {
        console.error('Error in global addRestaurantData:', error);
    }
};

// Add CSS for toast slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Emergency fallback - if nothing happens after 5 seconds, force auth screen
setTimeout(() => {
    console.log('Emergency fallback: forcing auth screen');
    const loadingScreen = document.getElementById('loading-screen');
    const authScreen = document.getElementById('auth-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreen) authScreen.style.display = 'flex';
}, 5000); 