// CARILLION curated pack. Each record is one scoring scenario; forms are
// accepted spellings, initials, and common short names for that scenario.
const answer = (points, forms, note = "") => ({
  points,
  forms: forms.split("|").map(value => value.trim()),
  note
});

window.DIVE_QUESTIONS = [
  {
    prompt: "Name a Minnesota Intercollegiate Athletic Conference (MIAC) school.",
    source: "https://miacathletics.com/sports/2022/4/20/members-index.aspx",
    answers: [
      answer(10, "Carleton College|Carleton"),
      answer(10, "St. Olaf College|St Olaf|Saint Olaf"),
      answer(10, "Macalester College|Macalester"),
      answer(10, "Augsburg University|Augsburg"),
      answer(15, "Bethel University|Bethel"),
      answer(15, "Gustavus Adolphus College|Gustavus|Gustavus Adolphus"),
      answer(15, "Hamline University|Hamline"),
      answer(15, "Concordia College|Concordia Moorhead|Concordia-Moorhead"),
      answer(30, "College of Saint Benedict|Saint Benedict|St. Benedict|CSB"),
      answer(30, "St. Catherine University|Saint Catherine|St Catherine|St. Kate's|St Kates"),
      answer(30, "Saint John's University|St. John's|St Johns|SJU"),
      answer(60, "Saint Mary's University of Minnesota|Saint Mary's|St. Mary's|St Marys"),
      answer(85, "The College of St. Scholastica|College of St. Scholastica|St. Scholastica|CSS")
    ]
  },
  {
    prompt: "Name a county in Minnesota.",
    source: "https://mn.gov/portal/government/local/counties/",
    answers: [
      answer(10, "Hennepin"), answer(10, "Ramsey"), answer(10, "Dakota"), answer(10, "Anoka"),
      answer(15, "St. Louis|Saint Louis|Saint Louis County"), answer(15, "Olmsted"),
      answer(15, "Washington"), answer(15, "Stearns"), answer(15, "Wright"), answer(15, "Scott"),
      answer(30, "Blue Earth"), answer(30, "Crow Wing"), answer(30, "Otter Tail"),
      answer(30, "Beltrami"), answer(30, "Clay"), answer(30, "Carver"), answer(30, "Sherburne"),
      answer(30, "Rice"), answer(30, "Steele"), answer(30, "Goodhue"),
      answer(60, "Aitkin"), answer(60, "Becker"), answer(60, "Benton"), answer(60, "Brown"),
      answer(60, "Carlton"), answer(60, "Cass"), answer(60, "Chippewa"), answer(60, "Chisago"),
      answer(60, "Clearwater"), answer(60, "Cook"), answer(60, "Cottonwood"), answer(60, "Dodge"),
      answer(60, "Douglas"), answer(60, "Faribault"), answer(60, "Fillmore"), answer(60, "Freeborn"),
      answer(60, "Grant"), answer(60, "Houston"), answer(60, "Hubbard"), answer(60, "Isanti"),
      answer(60, "Itasca"), answer(60, "Jackson"), answer(60, "Kanabec"), answer(60, "Kandiyohi"),
      answer(60, "Kittson"), answer(60, "Koochiching"), answer(60, "Lake"), answer(60, "Lincoln"),
      answer(60, "Lyon"), answer(60, "Marshall"), answer(60, "Martin"), answer(60, "McLeod"),
      answer(60, "Meeker"), answer(60, "Morrison"), answer(60, "Mower"),
      answer(60, "Murray"), answer(60, "Nicollet"), answer(60, "Nobles"), answer(60, "Norman"),
      answer(60, "Pennington"), answer(60, "Pine"), answer(60, "Pipestone"), answer(60, "Polk"),
      answer(60, "Pope"), answer(60, "Redwood"), answer(60, "Renville"),
      answer(60, "Rock"), answer(60, "Roseau"), answer(60, "Sibley"), answer(60, "Stevens"),
      answer(60, "Swift"), answer(60, "Todd"), answer(60, "Traverse"), answer(60, "Wabasha"),
      answer(60, "Wadena"), answer(60, "Waseca"), answer(60, "Watonwan"), answer(60, "Wilkin"),
      answer(60, "Winona"), answer(60, "Yellow Medicine"),
      answer(85, "Big Stone"), answer(85, "Lake of the Woods"), answer(85, "Lac qui Parle|Lac Qui Parle"),
      answer(85, "Le Sueur"), answer(85, "Mahnomen"), answer(85, "Red Lake"),
      answer(100, "Mille Lacs|Mille Lacs County", "The name means ‘a thousand lakes’ in French.")
    ]
  },
  {
    prompt: "Name an academic building at Carleton College.",
    source: "https://cdn.carleton.edu/uploads/sites/782/2024/09/Map_11x14_2024-v5.pdf",
    answers: [
      answer(10, "Gould Library|Laurence McKinley Gould Library"),
      answer(10, "Anderson Hall|Anderson"), answer(10, "Olin Hall|Olin Hall of Science|Olin"),
      answer(10, "Weitz Center for Creativity|Weitz Center|Weitz"),
      answer(15, "Boliou Hall|Boliou"), answer(15, "Laird Hall|Laird"),
      answer(15, "Leighton Hall|Leighton"), answer(15, "Willis Hall|Willis"),
      answer(15, "Center for Mathematics and Computing|CMC|Math and Computing Center"),
      answer(15, "Language and Dining Center|Language & Dining Center|LDC"),
      answer(30, "Goodsell Observatory|Goodsell"), answer(30, "Hulings Hall|Hulings"),
      answer(30, "Hasenstab Hall|Hasenstab"), answer(30, "Music Hall"),
      answer(30, "Severance Hall|Severance"), answer(30, "Sayles-Hill Campus Center|Sayles-Hill|Sayles Hill"),
      answer(30, "Scoville Hall|Scoville"), answer(30, "Skinner Memorial Chapel|Skinner Chapel"),
      answer(60, "von Klemperer Classroom|von Klemperer"),
      answer(60, "Nourse Hall|Nourse"), answer(60, "Mudd Hall of Science|Mudd Hall"),
      answer(60, "Myers Hall|Myers"), answer(60, "Burton Hall|Burton"),
      answer(85, "Concert Hall|Carleton Concert Hall"),
      answer(85, "Cowling Gymnasium|Cowling"), answer(100, "West Gymnasium|West Gym")
    ]
  },
  {
    prompt: "Name a famous Carleton College alum listed on Wikipedia.",
    source: "https://en.wikipedia.org/wiki/List_of_Carleton_College_people",
    answers: [
      answer(10, "Thorstein Veblen|Veblen"), answer(10, "Pierce Butler"),
      answer(10, "Melvin Laird|Melvin R. Laird"), answer(10, "Jimmy Chin"),
      answer(15, "Jonathan Capehart"), answer(15, "Christopher Kratt|Chris Kratt"),
      answer(15, "Kai Bird"), answer(15, "T. J. Stiles|TJ Stiles|T.J. Stiles"),
      answer(30, "Walter Alvarez"), answer(30, "Anthony Downs"),
      answer(30, "John F. Harris|John Harris"), answer(30, "Naomi Kritzer"),
      answer(30, "Peter Tork|Peter Tork of the Monkees"), answer(30, "Laura Veirs"),
      answer(30, "Kao Kalia Yang"), answer(30, "Patricia C. Wrede|Patricia Collins Wrede|Patricia Wrede"),
      answer(60, "Maya Dusenbery"), answer(60, "Jack El-Hai|Jack Elhai"),
      answer(60, "Michael Gartner"), answer(60, "Helene Wecker"),
      answer(60, "Karen Tei Yamashita"), answer(60, "Eugenie Moore Anderson|Eugenie Anderson"),
      answer(85, "Rush Holt Jr.|Rush Holt"), answer(85, "Michael Armacost"),
      answer(85, "Fue Lee"), answer(100, "Jane Elizabeth Hodgson|Jane Hodgson")
    ]
  },
  {
    prompt: "Name a person who has received a knighthood.",
    source: "https://en.wikipedia.org/wiki/Order_of_the_British_Empire",
    answers: [
      answer(10, "Sir Paul McCartney|Paul McCartney"), answer(10, "Sir Elton John|Elton John"),
      answer(10, "Sir David Attenborough|David Attenborough"), answer(10, "Sir Ian McKellen|Ian McKellen"),
      answer(10, "Sir Patrick Stewart|Patrick Stewart"), answer(10, "Sir Lewis Hamilton|Lewis Hamilton"),
      answer(15, "Sir Anthony Hopkins|Anthony Hopkins"), answer(15, "Sir Michael Caine|Michael Caine"),
      answer(15, "Sir Mick Jagger|Mick Jagger"), answer(15, "Sir Andy Murray|Andy Murray"),
      answer(15, "Sir Mo Farah|Mo Farah|Mohamed Farah"), answer(15, "Sir Tim Berners-Lee|Tim Berners-Lee"),
      answer(30, "Sir Alec Guinness|Alec Guinness"), answer(30, "Sir Sean Connery|Sean Connery"),
      answer(30, "Sir Roger Moore|Roger Moore"), answer(30, "Sir Christopher Lee|Christopher Lee"),
      answer(30, "Sir Isaac Newton|Isaac Newton"), answer(30, "Sir Christopher Wren|Christopher Wren"),
      answer(30, "Sir Francis Drake|Francis Drake"), answer(30, "Sir Walter Raleigh|Walter Raleigh"),
      answer(60, "Sir Chris Hoy|Chris Hoy"), answer(60, "Sir Steve Redgrave|Steve Redgrave"),
      answer(60, "Sir Jackie Stewart|Jackie Stewart"), answer(85, "Sir Ringo Starr|Ringo Starr"),
      answer(85, "Sir Viv Richards|Viv Richards"), answer(100, "Sir James Dyson|James Dyson")
    ]
  },
  {
    prompt: "Name a major offered by Carleton College in 2026–27.",
    source: "https://cdn.carleton.edu/uploads/sites/875/2025/09/Carleton_AcademicCatalog_2025-26.pdf",
    sourceNote: "The 2026–27 catalog was not available in the public registrar catalog when this pack was prepared; this set follows the latest published 2025–26 catalog.",
    answers: [
      answer(10, "Biology"), answer(10, "Chemistry"), answer(10, "Computer Science|CS"),
      answer(10, "Economics"), answer(10, "English"), answer(10, "History"),
      answer(10, "Mathematics|Math"), answer(10, "Psychology"), answer(10, "Political Science"),
      answer(15, "Africana Studies"), answer(15, "American Studies"), answer(15, "Art History|Art and Art History"),
      answer(15, "Asian Studies"), answer(15, "Cinema and Media Studies|Cinema & Media Studies|CAMS"),
      answer(15, "Classics"), answer(15, "Environmental Studies"), answer(15, "Geology"),
      answer(15, "Linguistics"), answer(15, "Music"), answer(15, "Philosophy"),
      answer(30, "Cognitive Science|Cognitive Studies|CogSci"), answer(30, "French and Francophone Studies"),
      answer(30, "Gender, Women's and Sexuality Studies|GWSS|Women's and Gender Studies"),
      answer(30, "German"), answer(30, "Mathematics and Statistics|Math and Statistics"),
      answer(30, "Physics and Astronomy|Physics"), answer(30, "Religion"),
      answer(30, "Sociology and Anthropology|Sociology & Anthropology|SOAN"),
      answer(30, "Spanish"), answer(30, "Theater|Theatre"), answer(60, "Latin American Studies|LTAM"),
      answer(60, "Special Major|Self-designed major"), answer(85, "Archaeology"), answer(100, "International Relations")
    ]
  },
  {
    prompt: "Name a Seattle Seahawks wide receiver rostered for 2026–27, including the practice squad.",
    source: "https://www.seahawks.com/team/players-roster/",
    sourceNote: "Roster snapshot checked September 27, 2026. The team can change this list during the season.",
    answers: [
      answer(10, "Jaxon Smith-Njigba|JSN"), answer(10, "Cooper Kupp"),
      answer(15, "Rashid Shaheed"), answer(15, "Tory Horton"), answer(15, "Montorie Foster Jr.|Montorie Foster"),
      answer(30, "Jake Bobo"), answer(30, "Irv Charles|Irvin Charles"),
      answer(60, "Emmanuel Henderson Jr.|Emmanuel Henderson"), answer(60, "Julian Hicks"),
      answer(85, "Ricky White III|Ricky White"), answer(100, "Malick Meiga"),
      answer(100, "Emerald City Route Artist|ECRA")
    ]
  }
];
