/* ─────────────────────────────────────────────────────────────────────────────
   Comprehensive location data: Countries → States/Provinces → Cities
   India is fully detailed (all 36 states/UTs + major cities per state).
   Other major countries include states + key cities.
   Remaining countries list major cities directly (no sub-division).
──────────────────────────────────────────────────────────────────────────── */

type LocationEntry =
  | { kind: "states"; data: Record<string, string[]> }
  | { kind: "cities"; data: string[] };

const LOCATION_DATA: Record<string, LocationEntry> = {

  /* ── India ─────────────────────────────────────────────────────────── */
  "India": { kind: "states", data: {
    "Andaman and Nicobar Islands": ["Port Blair", "Car Nicobar", "Diglipur", "Rangat", "Mayabunder"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Tirupati", "Anantapur", "Kadapa", "Eluru", "Ongole", "Srikakulam", "Vizianagaram", "Machilipatnam"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Bomdila", "Ziro", "Tezu"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Dhubri", "Goalpara", "Diphu", "Sivasagar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Begusarai", "Ara", "Chapra", "Munger", "Aurangabad", "Saharsa", "Hajipur", "Samastipur"],
    "Chandigarh": ["Chandigarh", "Manimajra", "Dhanas"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Korba", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Ambikapur", "Raigarh", "Champa"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa", "Vapi"],
    "Delhi": ["New Delhi", "Central Delhi", "East Delhi", "North Delhi", "South Delhi", "West Delhi", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Lajpat Nagar", "Saket", "Shahdara"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Calangute", "Canacona"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Nadiad", "Morbi", "Bharuch", "Mehsana", "Surendranagar", "Valsad", "Navsari", "Porbandar"],
    "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Rewari", "Jhajjar", "Palwal"],
    "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Kullu", "Hamirpur", "Kangra", "Baddi", "Palampur", "Nahan", "Bilaspur"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Pulwama", "Kupwara", "Pampore"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Phusro", "Medininagar", "Chirkunda"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shimoga", "Tumkur", "Bidar", "Raichur", "Hassan", "Udupi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Kasaragod", "Pathanamthitta", "Idukki"],
    "Ladakh": ["Leh", "Kargil", "Diskit", "Padum"],
    "Lakshadweep": ["Kavaratti", "Agatti", "Andrott", "Minicoy"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Ratlam", "Satna", "Dewas", "Rewa", "Burhanpur", "Khandwa", "Bhind", "Morena", "Chhindwara"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Nanded", "Sangli", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Navi Mumbai"],
    "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul", "Senapati"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin", "Baghmara"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Serchhip"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Mon"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Brahmapur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Angul", "Dhenkanal", "Jharsuguda"],
    "Puducherry": ["Pondicherry", "Karaikal", "Mahe", "Yanam", "Ozhukarai"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Moga", "Rupnagar", "Ferozepur", "Sangrur", "Phagwara"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Barmer", "Jhunjhunu", "Chittorgarh", "Nagaur"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Mangan", "Rangpo", "Jorethang"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Vellore", "Erode", "Thoothukkudi", "Tirunelveli", "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Hosur", "Nagercoil", "Kanchipuram", "Cuddalore"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Medak", "Siddipet", "Suryapet"],
    "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Ambassa", "Belonia"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Prayagraj", "Ghaziabad", "Noida", "Mathura", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Firozabad", "Jhansi", "Muzaffarnagar", "Faizabad", "Rampur"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Nainital", "Mussoorie", "Kotdwar", "Pithoragarh"],
    "West Bengal": ["Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Haldia", "Kharagpur", "Malda", "Baharampur", "Krishnanagar", "Jalpaiguri", "Cooch Behar"],
  }},

  /* ── United States ─────────────────────────────────────────────────── */
  "United States": { kind: "states", data: {
    "Alabama": ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"],
    "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Sitka"],
    "Arizona": ["Phoenix", "Tucson", "Scottsdale", "Mesa", "Chandler", "Tempe"],
    "Arkansas": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale"],
    "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno", "Oakland", "Anaheim", "Santa Ana", "Riverside", "Palo Alto", "Irvine"],
    "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Boulder", "Lakewood"],
    "Connecticut": ["Hartford", "Bridgeport", "New Haven", "Stamford", "Waterbury"],
    "Delaware": ["Wilmington", "Dover", "Newark"],
    "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "St. Petersburg", "Tallahassee", "Hialeah"],
    "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens", "Sandy Springs"],
    "Hawaii": ["Honolulu", "Hilo", "Kailua", "Pearl City"],
    "Idaho": ["Boise", "Meridian", "Nampa", "Idaho Falls"],
    "Illinois": ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville", "Springfield", "Peoria"],
    "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel"],
    "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City"],
    "Kansas": ["Wichita", "Overland Park", "Kansas City", "Topeka"],
    "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Covington"],
    "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Metairie", "Lafayette"],
    "Maine": ["Portland", "Augusta", "Bangor", "Lewiston"],
    "Maryland": ["Baltimore", "Frederick", "Rockville", "Gaithersburg", "Annapolis"],
    "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "New Bedford"],
    "Michigan": ["Detroit", "Grand Rapids", "Warren", "Ann Arbor", "Lansing", "Sterling Heights"],
    "Minnesota": ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington"],
    "Mississippi": ["Jackson", "Gulfport", "Southaven", "Hattiesburg"],
    "Missouri": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence"],
    "Montana": ["Billings", "Missoula", "Great Falls", "Helena"],
    "Nebraska": ["Omaha", "Lincoln", "Bellevue"],
    "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
    "New Hampshire": ["Manchester", "Nashua", "Concord", "Derry"],
    "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Trenton", "Edison"],
    "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe"],
    "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle"],
    "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville"],
    "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot"],
    "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton"],
    "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond"],
    "Oregon": ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro"],
    "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton"],
    "Rhode Island": ["Providence", "Cranston", "Warwick", "Pawtucket"],
    "South Carolina": ["Columbia", "Charleston", "North Charleston", "Mount Pleasant", "Rock Hill"],
    "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen"],
    "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville"],
    "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo"],
    "Utah": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Ogden"],
    "Vermont": ["Burlington", "South Burlington", "Montpelier", "Rutland"],
    "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria"],
    "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kirkland"],
    "West Virginia": ["Charleston", "Huntington", "Morgantown", "Parkersburg"],
    "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine"],
    "Wyoming": ["Cheyenne", "Casper", "Laramie", "Gillette"],
    "District of Columbia": ["Washington D.C."],
  }},

  /* ── United Kingdom ────────────────────────────────────────────────── */
  "United Kingdom": { kind: "states", data: {
    "England": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Sheffield", "Bristol", "Leicester", "Newcastle", "Nottingham", "Cambridge", "Oxford", "Brighton"],
    "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness", "Stirling", "Perth"],
    "Wales": ["Cardiff", "Swansea", "Newport", "Bangor", "Wrexham"],
    "Northern Ireland": ["Belfast", "Derry", "Armagh", "Lisburn", "Newry"],
  }},

  /* ── Australia ─────────────────────────────────────────────────────── */
  "Australia": { kind: "states", data: {
    "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Central Coast", "Coffs Harbour", "Dubbo"],
    "Victoria": ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Shepparton", "Latrobe"],
    "Queensland": ["Brisbane", "Gold Coast", "Townsville", "Cairns", "Toowoomba", "Mackay", "Rockhampton"],
    "Western Australia": ["Perth", "Mandurah", "Bunbury", "Geraldton", "Kalgoorlie", "Albany"],
    "South Australia": ["Adelaide", "Mount Gambier", "Whyalla", "Port Augusta"],
    "Tasmania": ["Hobart", "Launceston", "Devonport", "Burnie"],
    "Australian Capital Territory": ["Canberra"],
    "Northern Territory": ["Darwin", "Alice Springs", "Katherine", "Palmerston"],
  }},

  /* ── Canada ────────────────────────────────────────────────────────── */
  "Canada": { kind: "states", data: {
    "Ontario": ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor"],
    "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Lévis"],
    "British Columbia": ["Vancouver", "Surrey", "Burnaby", "Richmond", "Kelowna", "Abbotsford", "Victoria"],
    "Alberta": ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Airdrie", "Medicine Hat"],
    "Manitoba": ["Winnipeg", "Brandon", "Steinbach", "Thompson"],
    "Saskatchewan": ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw"],
    "Nova Scotia": ["Halifax", "Dartmouth", "Sydney", "Truro"],
    "New Brunswick": ["Moncton", "Saint John", "Fredericton", "Bathurst"],
    "Newfoundland and Labrador": ["St. John's", "Mount Pearl", "Corner Brook"],
    "Prince Edward Island": ["Charlottetown", "Summerside"],
    "Northwest Territories": ["Yellowknife", "Hay River"],
    "Nunavut": ["Iqaluit", "Rankin Inlet"],
    "Yukon": ["Whitehorse", "Dawson City"],
  }},

  /* ── UAE ───────────────────────────────────────────────────────────── */
  "United Arab Emirates": { kind: "states", data: {
    "Abu Dhabi": ["Abu Dhabi", "Al Ain", "Ruwais", "Madinat Zayed"],
    "Dubai": ["Dubai", "Jebel Ali", "Deira", "Jumeirah"],
    "Sharjah": ["Sharjah", "Khor Fakkan", "Dibba Al Hisn"],
    "Ajman": ["Ajman", "Manama"],
    "Umm Al Quwain": ["Umm Al Quwain"],
    "Ras Al Khaimah": ["Ras Al Khaimah", "Al Jazirah Al Hamra"],
    "Fujairah": ["Fujairah", "Dibba Al Fujairah", "Khorfakkan"],
  }},

  /* ── Singapore ─────────────────────────────────────────────────────── */
  "Singapore": { kind: "cities", data: ["Singapore"] },

  /* ── Germany ───────────────────────────────────────────────────────── */
  "Germany": { kind: "states", data: {
    "Bavaria": ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Ingolstadt"],
    "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Duisburg", "Bonn"],
    "Baden-Württemberg": ["Stuttgart", "Mannheim", "Karlsruhe", "Freiburg", "Heidelberg"],
    "Berlin": ["Berlin"],
    "Hamburg": ["Hamburg"],
    "Saxony": ["Dresden", "Leipzig", "Chemnitz"],
    "Hesse": ["Frankfurt", "Wiesbaden", "Kassel", "Darmstadt"],
    "Brandenburg": ["Potsdam", "Cottbus", "Frankfurt an der Oder"],
    "Lower Saxony": ["Hanover", "Braunschweig", "Osnabrück", "Wolfsburg"],
    "Rhineland-Palatinate": ["Mainz", "Ludwigshafen", "Koblenz", "Trier"],
    "Saxony-Anhalt": ["Halle", "Magdeburg", "Dessau-Roßlau"],
    "Schleswig-Holstein": ["Kiel", "Lübeck", "Flensburg"],
    "Thuringia": ["Erfurt", "Jena", "Gera"],
    "Bremen": ["Bremen", "Bremerhaven"],
    "Mecklenburg-Vorpommern": ["Rostock", "Schwerin", "Greifswald"],
    "Saarland": ["Saarbrücken", "Neunkirchen"],
  }},

  /* ── France ────────────────────────────────────────────────────────── */
  "France": { kind: "states", data: {
    "Île-de-France": ["Paris", "Versailles", "Boulogne-Billancourt", "Saint-Denis"],
    "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Cannes"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble", "Saint-Étienne", "Clermont-Ferrand"],
    "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Poitiers"],
    "Occitanie": ["Toulouse", "Montpellier", "Nîmes", "Perpignan"],
    "Hauts-de-France": ["Lille", "Amiens", "Roubaix", "Tourcoing"],
    "Normandy": ["Rouen", "Caen", "Le Havre"],
    "Brittany": ["Rennes", "Brest", "Nantes"],
    "Grand Est": ["Strasbourg", "Reims", "Metz", "Nancy"],
    "Pays de la Loire": ["Nantes", "Le Mans", "Angers"],
    "Centre-Val de Loire": ["Tours", "Orléans", "Bourges"],
    "Bourgogne-Franche-Comté": ["Dijon", "Besançon", "Montbéliard"],
  }},

  /* ── Netherlands ───────────────────────────────────────────────────── */
  "Netherlands": { kind: "cities", data: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Leiden", "Maastricht"] },

  /* ── Switzerland ───────────────────────────────────────────────────── */
  "Switzerland": { kind: "cities", data: ["Zürich", "Geneva", "Basel", "Bern", "Lausanne", "Winterthur", "Lucerne", "St. Gallen", "Lugano", "Biel/Bienne"] },

  /* ── Japan ─────────────────────────────────────────────────────────── */
  "Japan": { kind: "states", data: {
    "Tokyo": ["Tokyo", "Shibuya", "Shinjuku", "Akihabara", "Roppongi"],
    "Osaka": ["Osaka", "Sakai", "Higashiosaka", "Toyonaka"],
    "Kanagawa": ["Yokohama", "Kawasaki", "Sagamihara"],
    "Aichi": ["Nagoya", "Toyota", "Okazaki"],
    "Sapporo / Hokkaido": ["Sapporo", "Asahikawa", "Hakodate"],
    "Fukuoka": ["Fukuoka", "Kitakyushu", "Kurume"],
    "Hyogo": ["Kobe", "Himeji", "Nishinomiya"],
    "Kyoto": ["Kyoto", "Uji", "Joyo"],
    "Hiroshima": ["Hiroshima", "Fukuyama", "Kure"],
    "Sendai / Miyagi": ["Sendai", "Ishinomaki"],
  }},

  /* ── China ─────────────────────────────────────────────────────────── */
  "China": { kind: "states", data: {
    "Beijing Municipality": ["Beijing"],
    "Shanghai Municipality": ["Shanghai"],
    "Chongqing Municipality": ["Chongqing"],
    "Tianjin Municipality": ["Tianjin"],
    "Guangdong": ["Guangzhou", "Shenzhen", "Dongguan", "Foshan", "Zhuhai"],
    "Shandong": ["Jinan", "Qingdao", "Yantai", "Weifang"],
    "Jiangsu": ["Nanjing", "Suzhou", "Wuxi", "Changzhou"],
    "Zhejiang": ["Hangzhou", "Ningbo", "Wenzhou", "Jinhua"],
    "Sichuan": ["Chengdu", "Mianyang", "Deyang"],
    "Hubei": ["Wuhan", "Yichang", "Xiangyang"],
    "Henan": ["Zhengzhou", "Luoyang", "Xinxiang"],
    "Hunan": ["Changsha", "Zhuzhou", "Xiangtan"],
    "Liaoning": ["Shenyang", "Dalian", "Anshan"],
    "Fujian": ["Fuzhou", "Xiamen", "Quanzhou"],
    "Shaanxi": ["Xi'an", "Xianyang", "Baoji"],
  }},

  /* ── South Korea ───────────────────────────────────────────────────── */
  "South Korea": { kind: "cities", data: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan", "Changwon", "Goyang"] },

  /* ── Malaysia ──────────────────────────────────────────────────────── */
  "Malaysia": { kind: "states", data: {
    "Selangor": ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Klang", "Ampang"],
    "Kuala Lumpur": ["Kuala Lumpur", "Chow Kit", "Mont Kiara", "Bangsar"],
    "Penang": ["George Town", "Butterworth", "Bayan Lepas"],
    "Johor": ["Johor Bahru", "Kulai", "Batu Pahat", "Muar"],
    "Perak": ["Ipoh", "Taiping", "Teluk Intan"],
    "Sabah": ["Kota Kinabalu", "Sandakan", "Tawau"],
    "Sarawak": ["Kuching", "Miri", "Sibu", "Bintulu"],
    "Putrajaya": ["Putrajaya"],
  }},

  /* ── Indonesia ─────────────────────────────────────────────────────── */
  "Indonesia": { kind: "states", data: {
    "Jakarta": ["Jakarta", "North Jakarta", "South Jakarta", "East Jakarta", "West Jakarta"],
    "East Java": ["Surabaya", "Malang", "Kediri", "Madiun"],
    "West Java": ["Bandung", "Bogor", "Bekasi", "Depok", "Cimahi"],
    "Central Java": ["Semarang", "Solo", "Yogyakarta", "Purwokerto"],
    "North Sumatra": ["Medan", "Binjai", "Sibolga"],
    "South Sulawesi": ["Makassar", "Parepare"],
    "Bali": ["Denpasar", "Kuta", "Ubud", "Singaraja"],
  }},

  /* ── Philippines ───────────────────────────────────────────────────── */
  "Philippines": { kind: "cities", data: ["Manila", "Quezon City", "Davao", "Cebu City", "Caloocan", "Zamboanga", "Taguig", "Antipolo", "Pasig", "Cagayan de Oro", "Paranaque", "Makati"] },

  /* ── Thailand ──────────────────────────────────────────────────────── */
  "Thailand": { kind: "cities", data: ["Bangkok", "Nonthaburi", "Pak Kret", "Hat Yai", "Chiang Mai", "Pattaya", "Phuket", "Khon Kaen", "Udon Thani", "Nakhon Ratchasima"] },

  /* ── Vietnam ───────────────────────────────────────────────────────── */
  "Vietnam": { kind: "cities", data: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Can Tho", "Bien Hoa", "Hue", "Nha Trang", "Vung Tau", "Quy Nhon"] },

  /* ── Sri Lanka ─────────────────────────────────────────────────────── */
  "Sri Lanka": { kind: "cities", data: ["Colombo", "Dehiwala", "Moratuwa", "Kandy", "Galle", "Jaffna", "Negombo", "Batticaloa", "Badulla", "Ratnapura"] },

  /* ── Nepal ─────────────────────────────────────────────────────────── */
  "Nepal": { kind: "cities", data: ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Birgunj", "Dharan", "Bharatpur", "Butwal", "Hetauda", "Janakpur"] },

  /* ── Bangladesh ────────────────────────────────────────────────────── */
  "Bangladesh": { kind: "cities", data: ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Comilla", "Rangpur", "Mymensingh", "Narayanganj", "Gazipur"] },

  /* ── Pakistan ──────────────────────────────────────────────────────── */
  "Pakistan": { kind: "states", data: {
    "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Multan", "Sargodha", "Sialkot", "Bahawalpur"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Mingora", "Abbottabad", "Kohat"],
    "Balochistan": ["Quetta", "Turbat", "Khuzdar"],
    "Islamabad Capital Territory": ["Islamabad"],
    "Azad Kashmir": ["Mirpur", "Muzaffarabad", "Rawalakot"],
  }},

  /* ── Myanmar ───────────────────────────────────────────────────────── */
  "Myanmar": { kind: "cities", data: ["Yangon", "Mandalay", "Naypyidaw", "Mawlamyine", "Bago", "Pathein", "Meiktila", "Myeik"] },

  /* ── Saudi Arabia ──────────────────────────────────────────────────── */
  "Saudi Arabia": { kind: "states", data: {
    "Riyadh": ["Riyadh", "Al Kharj", "Dawadmi"],
    "Makkah": ["Mecca", "Jeddah", "Taif"],
    "Eastern Province": ["Dammam", "Al-Ahsa", "Khobar", "Dhahran", "Qatif"],
    "Madinah": ["Medina", "Yanbu", "Al Ula"],
    "Asir": ["Abha", "Khamis Mushait"],
    "Tabuk": ["Tabuk", "Umluj"],
    "Northern Borders": ["Arar", "Rafha"],
  }},

  /* ── Kuwait ────────────────────────────────────────────────────────── */
  "Kuwait": { kind: "cities", data: ["Kuwait City", "Salmiya", "Hawally", "Farwaniyah", "Ahmadi", "Jahra"] },

  /* ── Qatar ─────────────────────────────────────────────────────────── */
  "Qatar": { kind: "cities", data: ["Doha", "Al Rayyan", "Al Wakrah", "Umm Salal", "Al Khor"] },

  /* ── Bahrain ───────────────────────────────────────────────────────── */
  "Bahrain": { kind: "cities", data: ["Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra"] },

  /* ── Oman ──────────────────────────────────────────────────────────── */
  "Oman": { kind: "cities", data: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Rustaq", "Buraimi"] },

  /* ── South Africa ──────────────────────────────────────────────────── */
  "South Africa": { kind: "states", data: {
    "Gauteng": ["Johannesburg", "Pretoria", "Ekurhuleni", "Tshwane"],
    "Western Cape": ["Cape Town", "Stellenbosch", "George", "Paarl"],
    "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Newcastle", "Richards Bay"],
    "Eastern Cape": ["Port Elizabeth", "East London", "Mthatha"],
    "Limpopo": ["Polokwane", "Tzaneen", "Musina"],
    "Mpumalanga": ["Mbombela", "Witbank", "Middelburg"],
    "North West": ["Rustenburg", "Mahikeng", "Klerksdorp"],
    "Free State": ["Bloemfontein", "Welkom", "Phuthaditjhaba"],
    "Northern Cape": ["Kimberley", "Upington", "De Aar"],
  }},

  /* ── Nigeria ───────────────────────────────────────────────────────── */
  "Nigeria": { kind: "cities", data: ["Lagos", "Kano", "Ibadan", "Abuja", "Port Harcourt", "Benin City", "Maiduguri", "Zaria", "Aba", "Kaduna", "Enugu", "Onitsha"] },

  /* ── Kenya ─────────────────────────────────────────────────────────── */
  "Kenya": { kind: "cities", data: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale"] },

  /* ── Ethiopia ──────────────────────────────────────────────────────── */
  "Ethiopia": { kind: "cities", data: ["Addis Ababa", "Dire Dawa", "Mek'ele", "Bahir Dar", "Gondar", "Hawassa", "Adama", "Jimma"] },

  /* ── Egypt ─────────────────────────────────────────────────────────── */
  "Egypt": { kind: "cities", data: ["Cairo", "Alexandria", "Giza", "Port Said", "Suez", "Luxor", "Aswan", "Mansoura", "Tanta", "Ismailia"] },

  /* ── Brazil ────────────────────────────────────────────────────────── */
  "Brazil": { kind: "states", data: {
    "São Paulo": ["São Paulo", "Campinas", "Guarulhos", "Santo André", "Sorocaba"],
    "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Nova Iguaçu", "Duque de Caxias"],
    "Minas Gerais": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora"],
    "Bahia": ["Salvador", "Feira de Santana", "Vitória da Conquista"],
    "Rio Grande do Sul": ["Porto Alegre", "Caxias do Sul", "Pelotas"],
    "Paraná": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa"],
    "Ceará": ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
    "Pernambuco": ["Recife", "Caruaru", "Olinda"],
    "Amazonas": ["Manaus", "Parintins"],
    "Brasília / Federal District": ["Brasília"],
  }},

  /* ── Argentina ─────────────────────────────────────────────────────── */
  "Argentina": { kind: "cities", data: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Tucumán", "La Plata", "Mar del Plata", "Salta", "Santa Fe", "San Juan"] },

  /* ── Mexico ────────────────────────────────────────────────────────── */
  "Mexico": { kind: "states", data: {
    "Mexico City": ["Mexico City"],
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque"],
    "Nuevo León": ["Monterrey", "San Nicolás de los Garza", "Apodaca"],
    "Puebla": ["Puebla", "Tehuacán"],
    "Guanajuato": ["León", "Irapuato", "Celaya"],
    "Coahuila": ["Saltillo", "Torreón", "Monclova"],
    "Chihuahua": ["Chihuahua", "Ciudad Juárez"],
    "State of Mexico": ["Toluca", "Ecatepec", "Naucalpan"],
    "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos"],
    "Sinaloa": ["Culiacán", "Mazatlán", "Los Mochis"],
  }},

  /* ── Russia ────────────────────────────────────────────────────────── */
  "Russia": { kind: "cities", data: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Nizhny Novgorod", "Kazan", "Chelyabinsk", "Omsk", "Samara", "Rostov-on-Don"] },

  /* ── Turkey ────────────────────────────────────────────────────────── */
  "Turkey": { kind: "cities", data: ["Istanbul", "Ankara", "Izmir", "Bursa", "Adana", "Antalya", "Gaziantep", "Konya", "Mersin", "Kayseri"] },

  /* ── Italy ─────────────────────────────────────────────────────────── */
  "Italy": { kind: "cities", data: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania", "Venice", "Verona"] },

  /* ── Spain ─────────────────────────────────────────────────────────── */
  "Spain": { kind: "cities", data: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba"] },

  /* ── Poland ────────────────────────────────────────────────────────── */
  "Poland": { kind: "cities", data: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice"] },

  /* ── Sweden ────────────────────────────────────────────────────────── */
  "Sweden": { kind: "cities", data: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg"] },

  /* ── Norway ────────────────────────────────────────────────────────── */
  "Norway": { kind: "cities", data: ["Oslo", "Bergen", "Stavanger", "Trondheim", "Drammen", "Fredrikstad", "Kristiansand"] },

  /* ── Denmark ───────────────────────────────────────────────────────── */
  "Denmark": { kind: "cities", data: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Frederiksberg", "Esbjerg"] },

  /* ── Finland ───────────────────────────────────────────────────────── */
  "Finland": { kind: "cities", data: ["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyväskylä"] },

  /* ── Belgium ───────────────────────────────────────────────────────── */
  "Belgium": { kind: "cities", data: ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur"] },

  /* ── Austria ───────────────────────────────────────────────────────── */
  "Austria": { kind: "cities", data: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach"] },

  /* ── New Zealand ───────────────────────────────────────────────────── */
  "New Zealand": { kind: "cities", data: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Napier", "Palmerston North", "Dunedin"] },

  /* ── Israel ────────────────────────────────────────────────────────── */
  "Israel": { kind: "cities", data: ["Jerusalem", "Tel Aviv", "Haifa", "Rishon LeZion", "Petah Tikva", "Ashdod", "Netanya", "Beer Sheva", "Holon"] },

  /* ── Iran ──────────────────────────────────────────────────────────── */
  "Iran": { kind: "cities", data: ["Tehran", "Mashhad", "Isfahan", "Karaj", "Shiraz", "Tabriz", "Qom", "Ahvaz", "Kermanshah"] },

  /* ── Iraq ──────────────────────────────────────────────────────────── */
  "Iraq": { kind: "cities", data: ["Baghdad", "Basra", "Mosul", "Erbil", "Sulaymaniyah", "Kirkuk", "Najaf", "Karbala"] },

  /* ── Afghanistan ───────────────────────────────────────────────────── */
  "Afghanistan": { kind: "cities", data: ["Kabul", "Kandahar", "Herat", "Mazar-i-Sharif", "Jalalabad", "Kunduz"] },

  /* ── Ghana ─────────────────────────────────────────────────────────── */
  "Ghana": { kind: "cities", data: ["Accra", "Kumasi", "Tamale", "Takoradi", "Ashaiman", "Ho", "Cape Coast"] },

  /* ── Tanzania ──────────────────────────────────────────────────────── */
  "Tanzania": { kind: "cities", data: ["Dar es Salaam", "Mwanza", "Arusha", "Dodoma", "Zanzibar City", "Morogoro", "Tanga"] },

  /* ── Uganda ────────────────────────────────────────────────────────── */
  "Uganda": { kind: "cities", data: ["Kampala", "Gulu", "Lira", "Mbarara", "Jinja", "Entebbe"] },

  /* ── Angola ────────────────────────────────────────────────────────── */
  "Angola": { kind: "cities", data: ["Luanda", "Huambo", "Lobito", "Benguela", "Malanje"] },

  /* ── Zambia ────────────────────────────────────────────────────────── */
  "Zambia": { kind: "cities", data: ["Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe"] },

  /* ── Zimbabwe ──────────────────────────────────────────────────────── */
  "Zimbabwe": { kind: "cities", data: ["Harare", "Bulawayo", "Chitungwiza", "Mutare", "Gweru"] },

  /* ── Morocco ───────────────────────────────────────────────────────── */
  "Morocco": { kind: "cities", data: ["Casablanca", "Rabat", "Fez", "Marrakech", "Agadir", "Tangier", "Meknes", "Oujda"] },

  /* ── Algeria ───────────────────────────────────────────────────────── */
  "Algeria": { kind: "cities", data: ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif"] },

  /* ── Colombia ──────────────────────────────────────────────────────── */
  "Colombia": { kind: "cities", data: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga", "Pereira"] },

  /* ── Peru ──────────────────────────────────────────────────────────── */
  "Peru": { kind: "cities", data: ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Iquitos", "Cusco", "Piura"] },

  /* ── Chile ─────────────────────────────────────────────────────────── */
  "Chile": { kind: "cities", data: ["Santiago", "Valparaíso", "Concepción", "Antofagasta", "Viña del Mar", "Temuco"] },

  /* ── Ireland ───────────────────────────────────────────────────────── */
  "Ireland": { kind: "cities", data: ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Dundalk"] },

  /* ── Portugal ──────────────────────────────────────────────────────── */
  "Portugal": { kind: "cities", data: ["Lisbon", "Porto", "Amadora", "Braga", "Funchal", "Coimbra", "Setúbal"] },

  /* ── Greece ────────────────────────────────────────────────────────── */
  "Greece": { kind: "cities", data: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos"] },

  /* ── Czech Republic ────────────────────────────────────────────────── */
  "Czech Republic": { kind: "cities", data: ["Prague", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc"] },

  /* ── Hungary ───────────────────────────────────────────────────────── */
  "Hungary": { kind: "cities", data: ["Budapest", "Debrecen", "Miskolc", "Szeged", "Pécs", "Győr"] },

  /* ── Romania ───────────────────────────────────────────────────────── */
  "Romania": { kind: "cities", data: ["Bucharest", "Cluj-Napoca", "Iași", "Timișoara", "Constanța", "Craiova", "Brașov"] },

  /* ── Ukraine ───────────────────────────────────────────────────────── */
  "Ukraine": { kind: "cities", data: ["Kyiv", "Kharkiv", "Odessa", "Dnipro", "Donetsk", "Zaporizhzhia", "Lviv"] },

  /* ── Kazakhstan ────────────────────────────────────────────────────── */
  "Kazakhstan": { kind: "cities", data: ["Almaty", "Nur-Sultan", "Shymkent", "Karaganda", "Aktobe"] },

  /* ── Maldives ──────────────────────────────────────────────────────── */
  "Maldives": { kind: "cities", data: ["Malé", "Addu City", "Fuvahmulah", "Kulhudhuffushi"] },

  /* ── Bhutan ────────────────────────────────────────────────────────── */
  "Bhutan": { kind: "cities", data: ["Thimphu", "Phuntsholing", "Paro", "Punakha", "Wangdi Phodrang"] },

  /* ── Cambodia ──────────────────────────────────────────────────────── */
  "Cambodia": { kind: "cities", data: ["Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville", "Kampong Cham"] },

  /* ── Laos ──────────────────────────────────────────────────────────── */
  "Laos": { kind: "cities", data: ["Vientiane", "Luang Prabang", "Savannakhet", "Pakse"] },

  /* ── Taiwan ────────────────────────────────────────────────────────── */
  "Taiwan": { kind: "cities", data: ["Taipei", "New Taipei", "Taichung", "Tainan", "Kaohsiung", "Hsinchu", "Taoyuan"] },

  /* ── Hong Kong ─────────────────────────────────────────────────────── */
  "Hong Kong": { kind: "cities", data: ["Hong Kong Island", "Kowloon", "New Territories"] },

  /* ── Macau ─────────────────────────────────────────────────────────── */
  "Macau": { kind: "cities", data: ["Macau", "Taipa", "Coloane"] },

  /* ── Brunei ────────────────────────────────────────────────────────── */
  "Brunei": { kind: "cities", data: ["Bandar Seri Begawan", "Kuala Belait", "Seria"] },
};

/* ─────────────────────────────────────────────────────────────────────────
   Public API
──────────────────────────────────────────────────────────────────────────── */

/** Sorted list of all countries. India is pinned first for Indian users. */
export function getCountries(): string[] {
  const all = Object.keys(LOCATION_DATA).sort();
  return ["India", ...all.filter(c => c !== "India")];
}

/** Returns states/provinces for a country, or [] if the country has no state-level split. */
export function getStates(country: string): string[] {
  const entry = LOCATION_DATA[country];
  if (!entry || entry.kind !== "states") return [];
  return Object.keys(entry.data).sort();
}

/** Returns cities for a given country + state. For countries with no states, pass state = "". */
export function getCities(country: string, state: string): string[] {
  const entry = LOCATION_DATA[country];
  if (!entry) return [];
  if (entry.kind === "cities") return [...entry.data].sort();
  const cities = entry.data[state] ?? [];
  return [...cities].sort();
}

/** True if this country has state-level data */
export function hasStates(country: string): boolean {
  const entry = LOCATION_DATA[country];
  return !!entry && entry.kind === "states";
}
