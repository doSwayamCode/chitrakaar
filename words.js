const words = {
    bollywood: [
        "Sholay", "DDLJ", "Lagaan", "Dangal", "Pushpa", "RRR", "Gadar",
        "Mughal-e-Azam", "Dil Chahta Hai", "Zindagi Na Milegi Dobara",
        "3 Idiots", "PK", "Barfi", "Queen", "Andaz Apna Apna",
        "Hera Pheri", "Golmaal", "Dhoom", "Kuch Kuch Hota Hai",
        "Kabhi Khushi Kabhie Gham", "Rang De Basanti", "Taare Zameen Par",
        "Gully Boy", "Bajrangi Bhaijaan", "Sultan", "Padmaavat",
        "Bahubali", "KGF", "Jawan", "Pathaan", "Animal", "Stree",
        "Munna Bhai", "Chak De India", "Swades", "Drishyam",
        "Gangs of Wasseypur", "Rockstar", "Barfi", "Highway",
        "Tamasha", "Yeh Jawaani Hai Deewani", "Wake Up Sid",
        "Cocktail", "Raanjhanaa", "Lootera", "Haider",
        "Udta Punjab", "Masaan", "Newton", "Tumbbad",
        "Super Deluxe", "Vikram", "Kantara", "Ponniyin Selvan",
        "Ala Vaikunthapurramuloo", "Arjun Reddy", "Jersey",
        "Sairat", "Dhadak", "Kai Po Che", "Raees",
        "Don", "Agneepath", "Ghajini", "Robot", "Enthiran",
        "Kabali", "Master", "Beast", "Leo"
    ],

    food: [
        "Biryani", "Pani Puri", "Samosa", "Jalebi", "Dosa", "Idli",
        "Chole Bhature", "Butter Chicken", "Paneer Tikka", "Vada Pav",
        "Pav Bhaji", "Gulab Jamun", "Rasgulla", "Chai", "Lassi",
        "Paratha", "Naan", "Tandoori Chicken", "Dal Makhani", "Rajma Chawal",
        "Masala Dosa", "Uttapam", "Poha", "Upma", "Kheer",
        "Rabri", "Kulfi", "Chaat", "Bhel Puri", "Sev Puri",
        "Kachori", "Dhokla", "Thepla", "Mysore Pak", "Payasam",
        "Rasam", "Pongal", "Halwa", "Ladoo", "Barfi",
        "Aloo Tikki", "Pakora", "Bhaji", "Puri", "Chapati",
        "Roti", "Raita", "Pickle", "Papad", "Chutney",
        "Panipuri", "Dabeli", "Misal Pav", "Thalipeeth", "Puran Poli",
        "Malpua", "Ghevar", "Shrikhand", "Basundi", "Modak",
        "Litti Chokha", "Sattu Paratha", "Cham Cham", "Sandesh",
        "Mishti Doi", "Filter Coffee", "Masala Chai", "Thandai",
        "Aam Panna", "Jaljeera", "Nimbu Pani", "Rooh Afza",
        "Paan", "Mukhwas", "Supari", "Gajak", "Chikki",
        "Imarti", "Balushahi", "Coconut Chutney", "Sambar",
        "Appam", "Puttu", "Kanji Vada", "Bisi Bele Bath"
    ],

    cricket: [
        "Helicopter Shot", "Yorker", "Googly", "LBW", "Duck",
        "Century", "Sixer", "Boundary", "Wicket", "Maiden Over",
        "Hat Trick", "Run Out", "Stumping", "Reverse Sweep", "Cover Drive",
        "Slip Fielding", "Third Umpire", "Powerplay", "Super Over", "Mankading",
        "Doosra", "Chinaman", "Bouncer", "No Ball", "Wide Ball",
        "Golden Duck", "Batting Collapse", "Tail Ender", "Opening Partnership",
        "Night Watchman", "Cricket Stadium", "Pitch Report", "Toss",
        "Leg Spin", "Off Spin", "Medium Pace", "Fast Bowling",
        "Catch", "Fielder", "Umpire", "Crease",
        "Stump", "Bail", "Pitch", "Outfield",
        "Sledging", "Decision Review System", "Free Hit", "Rain Delay",
        "Cricket World Cup", "IPL Trophy", "Test Match", "One Day International"
    ],

    festivals: [
        "Diwali", "Holi", "Navratri", "Durga Puja", "Ganesh Chaturthi",
        "Eid", "Christmas", "Pongal", "Onam", "Baisakhi",
        "Makar Sankranti", "Lohri", "Raksha Bandhan", "Janmashtami",
        "Dussehra", "Karva Chauth", "Chhath Puja", "Ugadi",
        "Bihu", "Vishu", "Ram Navami", "Maha Shivaratri",
        "Basant Panchami", "Teej", "Guru Nanak Jayanti",
        "Ravan Dahan", "Garba Night", "Dandiya Raas", "Kite Festival",
        "Flower Rangoli", "Diya Decoration", "Mehendi Ceremony",
        "Haldi Ceremony", "Sangeet Night", "Baraat Procession",
        "Pheras", "Sindoor", "Mangalsutra", "Christmas Tree",
        "New Year Fireworks", "Republic Day Parade", "Independence Day Flag"
    ],

    monuments: [
        "Taj Mahal", "Red Fort", "Qutub Minar", "Gateway of India",
        "Hawa Mahal", "India Gate", "Charminar", "Mysore Palace",
        "Golden Temple", "Lotus Temple", "Konark Sun Temple",
        "Ajanta Caves", "Ellora Caves", "Hampi", "Meenakshi Temple",
        "Brihadeeswarar Temple", "Victoria Memorial", "Sanchi Stupa",
        "Jantar Mantar", "Fatehpur Sikri", "Humayun Tomb",
        "Amer Fort", "Mehrangarh Fort", "City Palace Udaipur",
        "Jaisalmer Fort", "Gol Gumbaz", "Bibi Ka Maqbara",
        "Rashtrapati Bhavan", "Parliament House", "Howrah Bridge",
        "Marine Drive", "Bandra Worli Sea Link", "Statue of Unity",
        "Khajuraho Temple", "Somnath Temple", "Jagannath Temple",
        "Tirupati Temple", "Akshardham Temple", "Varanasi Ghats"
    ],

    personalities: [
        "Mahatma Gandhi", "APJ Abdul Kalam", "Sachin Tendulkar",
        "MS Dhoni", "Virat Kohli", "Amitabh Bachchan", "Shah Rukh Khan",
        "AR Rahman", "Lata Mangeshkar", "Ratan Tata",
        "Mother Teresa", "Rabindranath Tagore", "CV Raman",
        "Aryabhata", "Swami Vivekananda", "Subhas Chandra Bose",
        "Sardar Patel", "Jawaharlal Nehru", "Indira Gandhi",
        "Saina Nehwal", "PV Sindhu", "Neeraj Chopra", "Mary Kom",
        "Rajinikanth", "Salman Khan", "Aamir Khan", "Deepika Padukone",
        "Priyanka Chopra", "Ranveer Singh", "Akshay Kumar",
        "Kishore Kumar", "RD Burman", "Asha Bhosle",
        "Sonu Nigam", "Arijit Singh", "Shreya Ghoshal",
        "Kapil Dev", "Sunil Gavaskar", "Rahul Dravid", "Sourav Ganguly",
        "Rohit Sharma", "Jasprit Bumrah", "PT Usha", "Milkha Singh"
    ],

    clothes: [
        "Saree", "Kurta", "Dhoti", "Lehenga", "Sherwani",
        "Salwar Kameez", "Churidar", "Lungi", "Dupatta", "Turban",
        "Pagdi", "Nehru Jacket", "Bandhani", "Pattu Pavadai",
        "Mundu", "Ghagra Choli", "Anarkali", "Jodhpuri Suit",
        "Phulkari Dupatta", "Kolhapuri Chappal", "Mojari", "Jutti",
        "Mekhela Chador", "Pheran", "Topi", "Gandhi Cap",
        "Pathani Suit", "Achkan", "Angarkha", "Bandhgala",
        "Zari Work", "Chikan Work", "Kalamkari", "Ikat",
        "Pashmina Shawl", "Banarasi Saree", "Kanjeevaram Saree",
        "Chanderi Saree", "Pochampally Saree", "Paithani Saree"
    ],

    dailyLife: [
        "Auto Rickshaw", "Chai Tapri", "Jugaad", "Dabba",
        "Tiffin", "Cooler", "Pressure Cooker", "Matka",
        "Rangoli", "Diyas", "Agarbatti", "Tulsi Plant",
        "Charpai", "Jhula", "Mortar Pestle", "Tawa",
        "Chappal", "Bindi", "Mehendi", "Mangalsutra",
        "Sindoor", "Kalash", "Aarti Thali", "Puja Room",
        "Balcony Garden", "Water Tank", "Ceiling Fan", "Inverter",
        "Cricket Bat", "Carrom Board", "Ludo", "Gilli Danda",
        "Kite Flying", "Marbles", "Hopscotch", "Kabaddi",
        "Cycle Rickshaw", "Ambassador Car", "Bullock Cart", "Tractor",
        "Railway Platform", "Local Train", "Bus Conductor", "Ticket Counter",
        "Chai Wala", "Dhobi Ghat", "Barber Shop", "Paan Shop",
        "STD Booth", "Post Office", "Ration Shop", "Milk Booth",
        "Newspaper Boy", "Dabbawala", "Watchman", "Safai Karamchari",
        "Mochi", "Tailor", "Iron Press Wala", "Raddiwala",
        "Jugaad Vehicle", "Tempo", "Shared Auto", "Meter Taxi"
    ],

    slang: [
        "Jugaad", "Chakka Jam", "Bandh", "Dharna",
        "Gobar", "Pakka", "Kaccha", "Timepass",
        "Fundoo", "Bindaas", "Desi", "Firangi",
        "Yaar", "Bhai", "Arre", "Accha",
        "Theek Hai", "Chalo", "Bas", "Abey",
        "Arey Wah", "Uff", "Oho", "Shabash",
        "Fatafat", "Jaldi", "Aram Se", "Chillao Mat",
        "Paise De", "Kya Baat Hai", "Sahi Hai", "Gazab"
    ],

    memes: [
        "Rasode Mein Kaun Tha", "Binod", "Pawri Ho Rahi Hai",
        "Taarak Mehta", "Jethalal", "Shinchan",
        "Crime Patrol", "CID", "Arnab Goswami Debate",
        "Alok Nath Sanskari", "Rahul Gandhi Pappu",
        "Dhoni Helicopter", "Virat Aggression",
        "Nana Patekar Dialogue", "Baburao Apte",
        "Doga Filter", "Indian Wedding Dance",
        "Carry Minati Roast", "Round2Hell Skit", "BB Ki Vines",
        "Tanmay Bhat", "AIB Knockout", "TVF Pitchers",
        "Sacred Games Guruji", "Mirzapur Munna Bhaiya",
        "Scam 1992 Dialogue", "Panchayat Sachiv Ji"
    ],

    places: [
        "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
        "Jaipur", "Varanasi", "Goa", "Kerala Backwaters",
        "Ladakh", "Manali", "Shimla", "Darjeeling",
        "Rishikesh", "Udaipur", "Jodhpur", "Agra",
        "Amritsar", "Pondicherry", "Andaman Islands",
        "Sundarbans", "Kaziranga", "Jim Corbett",
        "Kodaikanal", "Munnar", "Ooty", "Hampi",
        "Leh", "Spiti Valley", "Coorg", "Wayanad",
        "Nainital", "Mussoorie", "Dehradun", "Haridwar",
        "Rameswaram", "Kanyakumari", "Madurai", "Hyderabad",
        "Ahmedabad", "Pune", "Lucknow", "Chandigarh",
        "Bhopal", "Indore", "Kochi", "Thiruvananthapuram"
    ],

    animals: [
        "Bengal Tiger", "Indian Elephant", "Peacock", "King Cobra",
        "Indian Rhinoceros", "Asiatic Lion", "Snow Leopard", "Red Panda",
        "Nilgiri Tahr", "Indian Bison", "Blackbuck", "Chinkara",
        "Langur", "Macaque", "Sloth Bear", "Indian Wolf",
        "Gharial", "Mugger Crocodile", "Indian Python", "Monitor Lizard",
        "Hornbill", "Flamingo", "Indian Parrot", "Kingfisher",
        "Indian Eagle", "Vulture", "Crane", "Indian Owl",
        "Desi Cow", "Water Buffalo", "Camel", "Yak",
        "Mountain Goat", "Mongoose", "Jackal", "Wild Boar"
    ],

    music: [
        "Sitar", "Tabla", "Harmonium", "Veena", "Sarangi",
        "Mridangam", "Dholak", "Shehnai", "Bansuri", "Santoor",
        "Tanpura", "Jaltarang", "Nagada", "Damru", "Ghungroo",
        "Classical Dance", "Kathak", "Bharatanatyam", "Odissi",
        "Kuchipudi", "Mohiniyattam", "Manipuri", "Kathakali",
        "Bhangra", "Garba", "Dandiya", "Lavani", "Bihu Dance",
        "Bollywood Dance", "Item Number", "Wedding DJ", "Sangeet"
    ],

    sports: [
        "Kabaddi", "Kho Kho", "Gilli Danda", "Lagori",
        "Kushti Wrestling", "Mallakhamb", "Silambam", "Gatka",
        "Polo", "Hockey", "Badminton", "Tennis",
        "Football", "Volleyball", "Table Tennis", "Boxing",
        "Archery", "Shooting", "Weightlifting", "Wrestling",
        "Chess", "Carrom", "Snakes and Ladders", "Ludo",
        "Pittu Garam", "Chain Chain", "Dog and the Bone", "Chor Police"
    ],

    nature: [
        "Himalayan Mountain", "Ganges River", "Indian Ocean", "Thar Desert",
        "Western Ghats", "Eastern Ghats", "Deccan Plateau", "Sundarbans Mangrove",
        "Backwaters", "Tea Plantation", "Spice Garden", "Paddy Field",
        "Coconut Palm", "Banyan Tree", "Neem Tree", "Peepal Tree",
        "Mango Tree", "Bamboo Forest", "Lotus Pond", "Tulsi Plant",
        "Jasmine Flower", "Marigold Garland", "Rose Garden", "Sunflower Field",
        "Monsoon Rain", "Rainbow", "Sunrise Himalayas", "Sunset Beach"
    ]
};

// Mode -> category mapping
const modeCategories = {
    classic: null,
    bollywood: ['bollywood', 'personalities', 'memes'],
    cricket: ['cricket', 'sports', 'personalities'],
    food: ['food', 'dailyLife'],
    festivals: ['festivals', 'dailyLife'],
    travel: ['places', 'monuments'],
    culture: ['dailyLife', 'clothes', 'slang', 'music'],
    history: ['monuments', 'personalities'],
    nature: ['animals', 'nature'],
    memes: ['memes', 'personalities', 'bollywood'],
    hard: ['monuments', 'personalities', 'places']
};

// Flatten words, optionally filtered by mode
function getWordPool(mode = 'classic') {
    const cats = modeCategories[mode] || null;
    const all = [];
    for (const [cat, catWords] of Object.entries(words)) {
        if (!cats || cats.includes(cat)) {
            all.push(...catWords);
        }
    }
    return all;
}

// Get N random words (no duplicates)
function getRandomWords(n = 3, usedWords = [], mode = 'classic') {
    const pool = getWordPool(mode).filter(w => !usedWords.includes(w));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

module.exports = { words, modeCategories, getWordPool, getRandomWords };
