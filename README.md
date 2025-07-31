# 🍔 BurgerRank

**The Ultimate Burger Rating & Discovery App**

Rate burgers, discover the best spots, and share your burger experiences with friends!

## ✨ Features

### 🏆 **Smart Ranking System**
- **Bayesian Average Algorithm** - Fair ranking that considers both rating and number of votes
- **Top Ranked** - Burgers with 10+ votes, sorted by weighted score
- **New & Trending** - New burgers with <10 votes, sorted by raw average

### 📍 **Location-Based Discovery**
- **ZIP Code Search** - Find burgers near you
- **Radius Filtering** - Adjust search radius from 1-100 miles
- **Show All** - Browse all burgers regardless of location

### 🍔 **Rich Burger Profiles**
- **Detailed Information** - Photos, ratings, reviews, and stats
- **Restaurant Details** - Address, phone, website, social media
- **Order Integration** - Direct links to DoorDash and OpenTable
- **Google Maps** - One-click navigation to restaurants

### 👥 **Social Features**
- **User Reviews** - Rate and comment on burgers
- **Review Previews** - Quick previews on the leaderboard
- **User Profiles** - Track your ratings and history
- **Live Search** - Find existing burgers to prevent duplicates

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Beautiful Interface** - Modern gradients and smooth animations
- **Intuitive Navigation** - Easy-to-use interface
- **Dark/Light Theme** - Comfortable viewing in any lighting

## 🚀 Quick Start

### **For Users:**
1. **Visit the app** at [your-deployed-url]
2. **Create an account** or sign in
3. **Browse burgers** or search by location
4. **Rate burgers** and share your experiences
5. **Discover new spots** through the leaderboard

### **For Developers:**
1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd burger-rank
   ```

2. **Open in browser**
   ```bash
   python3 -m http.server 8000
   ```
   Then visit `http://localhost:8000`

3. **Start developing!**
   - Edit `index.html` for structure
   - Edit `styles.css` for styling
   - Edit `script.js` for functionality

## 🛠️ Technical Details

### **Frontend Stack:**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **Vanilla JavaScript (ES6+)** - No frameworks, pure JS
- **Local Storage** - Client-side data persistence

### **Key Algorithms:**
- **Bayesian Average** for fair ranking
- **Distance calculation** for location filtering
- **Data migration** for app updates

### **Data Structure:**
- **Burgers** - Name, restaurant, photo, ratings
- **Restaurants** - Details, links, location
- **Users** - Profiles, ratings, preferences
- **Ranks** - User ratings with comments

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (limited support)

## 🔧 Development

### **File Structure:**
```
burger-rank/
├── index.html          # Main app structure
├── styles.css          # All styling
├── script.js           # App logic
└── README.md           # This file
```

### **Key Methods:**
- `showBurgerDetail()` - Display burger profile
- `submitRank()` - Add new rating
- `loadLeaderboard()` - Update main list
- `performSearch()` - Location-based filtering

## 🌟 What Makes BurgerRank Special

1. **Smart Ranking** - Not just average ratings, but weighted scores
2. **Location Intelligence** - Find burgers near you
3. **Rich Data** - Photos, reviews, restaurant details
4. **Social Features** - Share and discover with friends
5. **Beautiful Design** - Modern, responsive interface
6. **No Backend Required** - Pure frontend with local storage

## 🚀 Deployment

### **GitHub Pages:**
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to main branch
4. Your app will be live at `https://username.github.io/repository-name`

### **Netlify:**
1. Drag and drop the folder to Netlify
2. Get instant HTTPS and custom domain
3. Automatic deployments on git push

### **Vercel:**
1. Connect GitHub repository
2. Automatic deployments
3. Excellent performance

## 📈 Future Features

- [ ] **User Lists** - Create custom burger lists
- [ ] **Photo Upload** - Enhanced image handling
- [ ] **Social Sharing** - Share burgers on social media
- [ ] **Advanced Filters** - Price, cuisine type, etc.
- [ ] **Mobile App** - Native iOS/Android versions
- [ ] **Backend Integration** - Cloud data storage
- [ ] **Real-time Updates** - Live rating updates
- [ ] **Analytics Dashboard** - Restaurant insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Font Awesome** for icons
- **Google Fonts** for typography
- **CSS Grid/Flexbox** for layouts
- **Local Storage API** for data persistence

---

**Made with ❤️ for burger lovers everywhere!**

*Rate responsibly, eat deliciously! 🍔* 