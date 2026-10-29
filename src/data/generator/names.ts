// Regional first-name and surname pools. Demo creators are fictional: a first name and a surname from
// the same pool are combined at random. Surnames shared by very famous families are left out of the
// pools, and FAMOUS_NAMES blocks combinations that would name a well-known real person.
import type { Gender } from "../../types";
import type { Rng } from "./random";

export type NameGroup =
  | "hindi"
  | "urdu"
  | "punjabi"
  | "marathi"
  | "gujarati"
  | "bengali"
  | "odia"
  | "assamese"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "keralaChristian"
  | "keralaMuslim"
  | "goan"
  | "parsi"
  | "khasi"
  | "meitei";

interface NamePool {
  female: string[];
  male: string[];
  last: string[];
  /** Surnames used only with female first names (e.g. Kaur, Devi). */
  lastFemale?: string[];
  /** Surnames used only with male first names (e.g. Singh in Manipur). */
  lastMale?: string[];
}

const POOLS: Record<NameGroup, NamePool> = {
  hindi: {
    female: [
      "Aanchal", "Aditi", "Akanksha", "Ankita", "Anjali", "Aparna", "Archana", "Bhavna", "Charu", "Deepti", "Divya",
      "Garima", "Isha", "Jyoti", "Kavita", "Khushi", "Kritika", "Mansi", "Megha", "Muskan", "Neha", "Nidhi", "Pallavi",
      "Prachi", "Pragya", "Preeti", "Rashmi", "Ritu", "Ruchi", "Sakshi", "Shalini", "Shikha", "Shivani", "Shruti",
      "Sneha", "Sonal", "Swati", "Tanvi", "Vandana", "Vartika", "Yamini",
    ],
    male: [
      "Aakash", "Abhinav", "Aditya", "Ajay", "Akhil", "Alok", "Anand", "Ankit", "Anuj", "Arpit", "Arun", "Ashish",
      "Ayush", "Deepak", "Devansh", "Gaurav", "Harsh", "Himanshu", "Kartik", "Kunal", "Manish", "Mayank", "Mohit",
      "Naveen", "Nikhil", "Nitin", "Prashant", "Pratik", "Rahul", "Rajat", "Rakesh", "Ravi", "Sanjay", "Saurabh",
      "Shivam", "Siddharth", "Sumit", "Tarun", "Utkarsh", "Varun", "Vineet", "Vishal",
    ],
    last: [
      "Sharma", "Verma", "Gupta", "Mishra", "Tiwari", "Pandey", "Yadav", "Singh", "Chauhan", "Srivastava", "Agarwal",
      "Saxena", "Rathore", "Tripathi", "Dubey", "Chaudhary", "Rawat", "Bisht", "Negi", "Thakur", "Shukla", "Awasthi",
      "Bajpai", "Dwivedi", "Jaiswal", "Kushwaha", "Maurya", "Sinha", "Jha", "Prasad", "Soni", "Garg", "Goel",
      "Bhardwaj", "Malviya", "Tomar", "Sengar", "Parihar",
    ],
  },
  urdu: {
    female: ["Aafreen", "Alina", "Ayesha", "Hina", "Iqra", "Mehreen", "Nazia", "Rukhsar", "Sadia", "Saima", "Sana", "Shabnam", "Tabassum", "Zainab", "Zoya"],
    male: ["Adnan", "Arif", "Asif", "Danish", "Faizan", "Junaid", "Kashif", "Nadeem", "Rehan", "Sameer", "Tariq", "Zaid", "Zubair", "Owais", "Faraz"],
    last: ["Ahmed", "Ansari", "Qureshi", "Siddiqui", "Rizvi", "Naqvi", "Sheikh", "Hussain", "Zaidi", "Usmani", "Abbasi", "Kidwai"],
  },
  punjabi: {
    female: ["Amrit", "Gurleen", "Harleen", "Harpreet", "Jasmeen", "Kiranjot", "Manpreet", "Navneet", "Simran", "Sukhmani", "Prabhleen", "Taranjit", "Mehak", "Noor", "Ishmeet"],
    male: ["Amandeep", "Gurpreet", "Harjot", "Harman", "Inderjit", "Jaskaran", "Jaspreet", "Manjot", "Parminder", "Tejinder", "Gagan", "Harsimran", "Rajveer", "Kanwar", "Sahil"],
    last: ["Gill", "Sandhu", "Dhillon", "Grewal", "Sidhu", "Brar", "Sekhon", "Virk", "Ahluwalia", "Sethi", "Arora", "Bhatia", "Kalra", "Anand", "Walia", "Sodhi"],
    lastFemale: ["Kaur"],
  },
  marathi: {
    female: ["Aarti", "Ashwini", "Gauri", "Ketaki", "Madhura", "Manasi", "Pranali", "Rutuja", "Sayali", "Snehal", "Swapnali", "Tejaswini", "Vaishnavi", "Mitali", "Shraddha", "Aboli"],
    male: ["Aniket", "Chinmay", "Harshad", "Mandar", "Omkar", "Prathamesh", "Sagar", "Shantanu", "Siddhesh", "Tejas", "Vinayak", "Yogesh", "Ketan", "Amey", "Nilesh", "Sushant"],
    last: [
      "Patil", "Deshmukh", "Kulkarni", "Joshi", "Pawar", "Jadhav", "Shinde", "Gaikwad", "Bhosale", "Deshpande", "Kale",
      "More", "Chavan", "Salunkhe", "Kamble", "Sawant", "Naik", "Gokhale", "Phadke", "Karnik", "Mahajan", "Bhide", "Wagle",
    ],
  },
  gujarati: {
    female: ["Aesha", "Bhakti", "Dhara", "Dhruvi", "Hetal", "Jinal", "Khushali", "Krupa", "Pinal", "Riddhi", "Ruchita", "Trupti", "Urvi", "Vaidehi", "Zeel", "Foram"],
    male: ["Bhavik", "Chirag", "Darshan", "Dhaval", "Jigar", "Kalpesh", "Keval", "Mihir", "Parth", "Rushabh", "Tushar", "Vatsal", "Dhruv", "Hiren", "Jainam", "Nisarg"],
    last: ["Patel", "Shah", "Mehta", "Desai", "Parikh", "Trivedi", "Dave", "Vyas", "Bhatt", "Thakkar", "Kothari", "Sheth", "Raval", "Panchal", "Solanki", "Doshi", "Amin", "Upadhyay"],
  },
  bengali: {
    female: ["Arpita", "Debolina", "Ishita", "Moumita", "Oindrila", "Paromita", "Poulami", "Sanchita", "Sohini", "Sudeshna", "Trisha", "Urmi", "Madhurima", "Rupsa", "Tiyasha", "Shreya"],
    male: ["Anirban", "Debashish", "Dipankar", "Indranil", "Kaustav", "Pratim", "Rajarshi", "Rupam", "Saptarshi", "Shubhankar", "Subhajit", "Tathagata", "Joydeep", "Sayan", "Arka", "Sagnik"],
    last: [
      "Banerjee", "Chatterjee", "Mukherjee", "Das", "Bose", "Sen", "Ghosh", "Dutta", "Roy", "Chakraborty", "Bhattacharya",
      "Sarkar", "Mitra", "Saha", "Paul", "Majumdar", "Biswas", "Sengupta", "Dasgupta", "Haldar", "Mondal", "Basak", "Nandy",
    ],
  },
  odia: {
    female: ["Anwesha", "Barsha", "Debasmita", "Lipsa", "Madhusmita", "Pragyan", "Sasmita", "Smruti", "Subhasmita", "Swagatika", "Archita", "Itishree"],
    male: ["Abinash", "Bibhuti", "Debasis", "Manas", "Pratyush", "Satyajit", "Sibasish", "Soumya", "Subrat", "Sudhansu", "Tapas", "Biswajit"],
    last: ["Mohanty", "Mishra", "Sahu", "Behera", "Panda", "Rout", "Nayak", "Mohapatra", "Swain", "Jena", "Sahoo", "Biswal", "Dash", "Tripathy", "Samal", "Parida", "Senapati"],
  },
  assamese: {
    female: ["Anamika", "Bornali", "Chayanika", "Dikshita", "Jahnavi", "Nilakshi", "Pallabi", "Rimjhim", "Trishna", "Upasana", "Ankita", "Gitanjali"],
    male: ["Bhaskar", "Bitopan", "Diganta", "Hiranya", "Jyotishman", "Kaushik", "Manash", "Nayan", "Partha", "Pranjal", "Rituraj", "Utpal"],
    last: ["Bora", "Baruah", "Saikia", "Kalita", "Deka", "Bhuyan", "Phukan", "Borthakur", "Sarma", "Medhi", "Konwar", "Talukdar", "Bordoloi", "Kakoti"],
  },
  tamil: {
    female: [
      "Anitha", "Bhavani", "Deepa", "Gayathri", "Harini", "Janani", "Kavya", "Keerthana", "Nandhini", "Priya",
      "Sangeetha", "Sowmya", "Swathi", "Vidhya", "Yazhini", "Abinaya", "Dharshini", "Pavithra",
    ],
    male: [
      "Arjun", "Arun", "Balaji", "Ganesh", "Gokul", "Hari", "Karthik", "Madhan", "Manikandan", "Prakash", "Pradeep",
      "Ragul", "Saravanan", "Senthil", "Siva", "Vignesh", "Sathish", "Logesh",
    ],
    last: [
      "Iyer", "Iyengar", "Pillai", "Raman", "Krishnan", "Subramanian", "Natarajan", "Rajendran", "Venkatesan",
      "Murugesan", "Sundaram", "Balasubramanian", "Ramasamy", "Arumugam", "Shanmugam", "Palanisamy", "Chandran",
      "Selvaraj", "Rajan", "Kannan",
    ],
  },
  telugu: {
    female: ["Bhavana", "Deepthi", "Harika", "Keerthi", "Madhavi", "Mounika", "Navya", "Sahithi", "Samatha", "Sravani", "Swapna", "Tejaswi", "Vaishnavi", "Varsha", "Sirisha", "Akhila"],
    male: ["Abhiram", "Bharath", "Harsha", "Karthikeya", "Kiran", "Pavan", "Praveen", "Raghu", "Sai", "Sandeep", "Srinivas", "Sudheer", "Vamsi", "Venkat", "Rohith", "Anvesh"],
    last: ["Reddy", "Rao", "Naidu", "Chowdary", "Varma", "Raju", "Sastry", "Murthy", "Prasad", "Goud", "Kondapalli", "Gaddam", "Bandi", "Kotha", "Vemula", "Tummala"],
  },
  kannada: {
    female: ["Ananya", "Bhoomika", "Chaitra", "Deeksha", "Harshitha", "Meghana", "Nayana", "Pavithra", "Prarthana", "Ranjini", "Shwetha", "Spoorthi", "Sushma", "Yashaswini", "Apoorva", "Sinchana"],
    male: ["Abhishek", "Adarsh", "Anirudh", "Chethan", "Harish", "Karthik", "Kiran", "Manjunath", "Pradeep", "Raghavendra", "Shashank", "Srujan", "Varun", "Vinay", "Prashanth", "Sumanth"],
    last: ["Gowda", "Shetty", "Hegde", "Rao", "Bhat", "Kamath", "Shenoy", "Nayak", "Kulkarni", "Murthy", "Prabhu", "Acharya", "Hebbar", "Kini", "Pai", "Urs", "Poojary", "Karanth", "Alva"],
  },
  malayalam: {
    female: ["Anjana", "Athira", "Devika", "Gopika", "Lakshmi", "Meera", "Reshma", "Sneha", "Sreelakshmi", "Sruthi", "Anagha", "Gayathri", "Aiswarya", "Ammu"],
    male: ["Abhijith", "Akhil", "Arjun", "Ashwin", "Gokul", "Harikrishnan", "Jithin", "Midhun", "Nithin", "Sreejith", "Vishnu", "Vineeth", "Unni", "Adarsh"],
    last: ["Nair", "Menon", "Pillai", "Kurup", "Panicker", "Nambiar", "Warrier", "Unnithan", "Kartha", "Pothuval", "Varma"],
  },
  keralaChristian: {
    female: ["Ancy", "Anna", "Ashly", "Christy", "Jincy", "Merin", "Neethu", "Rosmi", "Sherin", "Teena", "Tessa", "Jisha"],
    male: ["Abin", "Alan", "Albin", "Bibin", "Ebin", "Febin", "Jebin", "Jobin", "Linto", "Melvin", "Sijo", "Tijo"],
    last: ["Thomas", "Joseph", "Mathew", "Kurian", "Varghese", "George", "Jacob", "Chacko", "Philip", "Cherian", "Antony", "Sebastian"],
  },
  keralaMuslim: {
    female: ["Fathima", "Hiba", "Nashwa", "Rinsha", "Shahana", "Shifa", "Ameena", "Najla"],
    male: ["Anas", "Faisal", "Jaseem", "Muhsin", "Nihal", "Rizwan", "Shameer", "Shihab", "Riyas", "Sinan"],
    last: ["Rahman", "Ali", "Basheer", "Koya", "Kunju", "Haneefa"],
  },
  goan: {
    female: ["Alisha", "Joanna", "Leanne", "Melissa", "Sharon", "Tanya", "Riya", "Natasha", "Freida", "Clara"],
    male: ["Aaron", "Clinton", "Darryl", "Glen", "Jason", "Kevin", "Nigel", "Savio", "Shane", "Wilson"],
    last: ["D'Souza", "Fernandes", "Pereira", "Rodrigues", "Gomes", "Pinto", "Mascarenhas", "Dias", "Lobo", "Colaco", "Vaz", "Gonsalves", "Kamat", "Naik"],
  },
  parsi: {
    female: ["Anahita", "Dilnavaz", "Mahrukh", "Shirin", "Tanaz", "Zenobia", "Delna", "Roshni", "Shernaz", "Avan"],
    male: ["Darius", "Farhad", "Jehangir", "Kaizad", "Rustom", "Xerxes", "Meherwan", "Behram", "Neville", "Hormuz"],
    last: ["Wadia", "Contractor", "Engineer", "Dastur", "Bharucha", "Daruwalla", "Batliwala", "Lalkaka", "Sethna", "Commissariat"],
  },
  khasi: {
    female: ["Daphi", "Ibadahun", "Grace", "Merrylin", "Wanda", "Iaishah", "Rida", "Esther"],
    male: ["Banteilang", "Wanphrang", "Kitboklang", "Donbok", "Ricky", "Aiban", "Kynsai", "Pynshngain"],
    last: ["Lyngdoh", "Kharkongor", "Syiemlieh", "Marbaniang", "Nongrum", "Wahlang", "Rymbai", "Kharbuli", "Lyngkhoi", "Dkhar"],
  },
  meitei: {
    female: ["Linthoi", "Sanatombi", "Thoibi", "Memcha", "Romila", "Bidyarani", "Ngambi", "Tampha"],
    male: ["Tomba", "Thoiba", "Ibomcha", "Ranjit", "Bishwajit", "Romen", "Premjit", "Sanajaoba"],
    last: ["Ningthoujam", "Laishram", "Wahengbam", "Khumanthem", "Thokchom", "Konsam", "Sorokhaibam", "Oinam"],
    lastFemale: ["Devi"],
    lastMale: ["Singh"],
  },
};

/**
 * Full names of well-known people that the pools could otherwise produce. Lowercase, apostrophes
 * removed. The generator re-draws whenever it lands on one of these.
 */
export const FAMOUS_NAMES: ReadonlySet<string> = new Set([
  // Film, music and TV
  "alia bhatt", "pooja bhatt", "mahesh bhatt", "vikram bhatt", "anushka sharma", "kapil sharma", "pankaj tripathi",
  "lavanya tripathi", "shilpa shetty", "shamita shetty", "suniel shetty", "sunil shetty", "rohit shetty", "rakshit shetty",
  "rishab shetty", "anushka shetty", "athiya shetty", "pooja hegde", "radhika apte", "sonali kulkarni", "atul kulkarni",
  "mrinal kulkarni", "riteish deshmukh", "ritesh deshmukh", "genelia deshmukh", "smita patil", "swapnil joshi",
  "sharman joshi", "prasoon joshi", "mrunal thakur", "prajakta mali", "nithya menon", "shweta menon", "anoop menon",
  "parvathy menon", "parvathy nair", "lakshmi menon", "trisha krishnan", "vijay sethupathi", "jeethu joseph",
  "tanushree dutta", "rituparna sengupta", "srabanti chatterjee", "soham chakraborty", "ritwik chakraborty",
  "ananya chatterjee", "anirban bhattacharya", "abhijit bhattacharya", "abhijeet bhattacharya", "sushmita sen",
  "riya sen", "raima sen", "aparna sen", "nandita das", "rani mukherjee", "neena gupta", "manoj tiwari", "amit trivedi",
  "kinjal dave", "vatsal sheth", "ameesha patel", "sonam bajwa", "ananya bhat", "vidya iyer", "ravi teja",
  "srinivas reddy", "sandeep reddy", "mahesh babu", "harshvardhan rane", "sanjeev kapoor", "ranveer singh",
  "arijit singh", "mika singh", "sukhwinder singh", "jassi gill", "kanan gill", "bhupen hazarika",
  // Sport
  "rohit sharma", "ishant sharma", "abhishek sharma", "mohit sharma", "shreyas iyer", "venkatesh iyer", "dinesh karthik",
  "ramesh krishnan", "harmanpreet kaur", "arshdeep singh", "yuvraj singh", "harbhajan singh", "milkha singh",
  "manish pandey", "karun nair", "parthiv patel", "axar patel", "munaf patel", "kuldeep yadav", "umesh yadav",
  "suryakumar yadav", "tilak varma", "mirabai chanu", "sanjita chanu", "sarita devi", "bembem devi", "hima das",
  "mayank agarwal", "deepak chahar", "rahul chahar", "shivam dubey",
  // Public life and business
  "amit shah", "jay shah", "kunal shah", "mamata banerjee", "abhishek banerjee", "abhijit banerjee", "pranab mukherjee",
  "somnath chatterjee", "amartya sen", "arundhati roy", "anita desai", "kiran desai", "morarji desai", "hardik patel",
  "bhupendra patel", "praful patel", "eknath shinde", "sharad pawar", "ajit pawar", "pratibha patil", "tarun gogoi",
  "ranjan gogoi", "gaurav gogoi", "naveen patnaik", "biju patnaik", "revanth reddy", "jagan reddy", "kiran reddy",
  "narasimha rao", "rama rao", "chandrababu naidu", "venkaiah naidu", "narayana murthy", "sudha murthy",
  "mohandas pai", "suresh prabhu", "nikhil kamath", "nithin kamath", "radhika gupta", "aman gupta", "ritesh agarwal",
  "vineeta singh", "akhilesh yadav", "gaurav chaudhary", "deepinder goyal", "hansal mehta", "harshad mehta",
  "deepa mehta", "zubin mehta", "rahul subramanian", "tanmay bhat", "rohan joshi", "sourav joshi", "komal pandey",
  "dolly singh", "kabita singh", "sharan hegde", "alakh pandey", "akshat srivastava", "shlok srivastava",
  "santoshi shetty", "sejal kumar", "kiran bedi", "raghav chadha", "himanta sarma", "dharmendra pradhan",
  "ranjit singh", "rahul sharma", "sanjay mishra", "saurabh shukla", "siddharth shukla", "rajat sharma", "rakesh sharma",
  "ankit tiwari", "varun sharma", "neha sharma", "divya agarwal", "isha gupta", "shikha pandey", "zoya hussain",
  "adnan sheikh", "asif sheikh", "navneet kaur", "simran kaur", "amrit kaur", "manpreet kaur", "gurpreet sandhu",
  "indranil sengupta", "sohini sarkar", "priya raman", "janani iyer", "pavan varma", "raghavendra rao", "harish rao",
  "kiran rao", "pavithra gowda", "meera nair", "lakshmi nair", "unni menon", "aiswarya menon", "sruthi menon",
  "devika nambiar", "tessa joseph", "rustom bharucha", "jehangir wadia", "neville wadia", "behram contractor",
]);

/** Name pools that suit a creator's home city and content language. */
export function nameGroupFor(rng: Rng, options: { lang: string; cityId: string; region: string }): NameGroup {
  const { lang, cityId, region } = options;
  if (cityId === "shillong") return "khasi";
  if (cityId === "imphal") return "meitei";
  if (cityId === "panaji") return rng.chance(0.75) ? "goan" : "marathi";
  switch (lang) {
    case "hi":
      return rng.chance(0.15) ? "urdu" : "hindi";
    case "pa":
      return "punjabi";
    case "mr":
      return "marathi";
    case "gu":
      return rng.chance(0.06) ? "parsi" : "gujarati";
    case "bn":
      return "bengali";
    case "or":
      return "odia";
    case "as":
      return "assamese";
    case "ta":
      return "tamil";
    case "te":
      return rng.chance(0.08) ? "urdu" : "telugu";
    case "kn":
      return "kannada";
    case "ml":
      return rng.weighted<NameGroup>(["malayalam", "keralaChristian", "keralaMuslim"], (g) =>
        g === "malayalam" ? 0.6 : g === "keralaChristian" ? 0.22 : 0.18,
      );
    default:
      break;
  }
  // English-first creators: metro mix, leaning on the home region's communities.
  const regional: Partial<Record<string, NameGroup[]>> = {
    north: ["hindi", "punjabi", "urdu"],
    central: ["hindi"],
    east: ["bengali", "hindi", "odia"],
    west: ["marathi", "gujarati", "hindi", "parsi", "goan"],
    south: ["tamil", "telugu", "kannada", "malayalam", "keralaChristian"],
    northeast: ["assamese", "khasi"],
  };
  if (rng.chance(0.6)) return rng.pick(regional[region] ?? ["hindi"]);
  return rng.weighted(METRO_MIX, (entry) => entry.weight).group;
}

const METRO_MIX: { group: NameGroup; weight: number }[] = [
  { group: "hindi", weight: 3 },
  { group: "punjabi", weight: 2 },
  { group: "urdu", weight: 1 },
  { group: "goan", weight: 1.2 },
  { group: "parsi", weight: 0.8 },
  { group: "bengali", weight: 0.8 },
  { group: "tamil", weight: 0.8 },
  { group: "marathi", weight: 0.8 },
  { group: "gujarati", weight: 0.6 },
  { group: "malayalam", weight: 0.6 },
  { group: "kannada", weight: 0.6 },
  { group: "telugu", weight: 0.6 },
];

export function nameKey(fullName: string): string {
  return fullName.toLowerCase().replace(/['’]/g, "");
}

/**
 * A random first + last name from one pool, re-drawn when it matches a famous person or a name already
 * in use (`taken` holds nameKey values), so the demo never shows two creators with the same name.
 */
export function pickName(rng: Rng, group: NameGroup, gender: Gender, taken: ReadonlySet<string> = new Set()): { first: string; last: string } {
  const pool = POOLS[group];
  const firstNames = gender === "female" ? pool.female : pool.male;
  const genderedLast = gender === "female" ? pool.lastFemale : pool.lastMale;
  let fallback: { first: string; last: string } | null = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const first = rng.pick(firstNames);
    const last = genderedLast && rng.chance(0.45) ? rng.pick(genderedLast) : rng.pick(pool.last);
    const key = nameKey(`${first} ${last}`);
    if (FAMOUS_NAMES.has(key)) continue;
    if (!taken.has(key)) return { first, last };
    fallback ??= { first, last };
  }
  // Only reachable for tiny pools that are already exhausted: a repeated name beats a famous one.
  return fallback ?? { first: firstNames[0], last: pool.last[0] };
}
