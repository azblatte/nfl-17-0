// 32 current NFL franchises. Historical players are mapped to the present-day franchise.
// `since` = first season the franchise existed (used to gate which decades can produce a real player).
const TEAMS = {
  ARI: { name: "Cardinals", city: "Arizona", color: "#97233F", alt: "#FFB612", since: 1960 },
  ATL: { name: "Falcons", city: "Atlanta", color: "#A71930", alt: "#000000", since: 1966 },
  BAL: { name: "Ravens", city: "Baltimore", color: "#241773", alt: "#9E7C0C", since: 1996 },
  BUF: { name: "Bills", city: "Buffalo", color: "#00338D", alt: "#C60C30", since: 1960 },
  CAR: { name: "Panthers", city: "Carolina", color: "#0085CA", alt: "#101820", since: 1995 },
  CHI: { name: "Bears", city: "Chicago", color: "#0B162A", alt: "#C83803", since: 1960 },
  CIN: { name: "Bengals", city: "Cincinnati", color: "#FB4F14", alt: "#000000", since: 1968 },
  CLE: { name: "Browns", city: "Cleveland", color: "#311D00", alt: "#FF3C00", since: 1960 },
  DAL: { name: "Cowboys", city: "Dallas", color: "#041E42", alt: "#869397", since: 1960 },
  DEN: { name: "Broncos", city: "Denver", color: "#FB4F14", alt: "#002244", since: 1960 },
  DET: { name: "Lions", city: "Detroit", color: "#0076B6", alt: "#B0B7BC", since: 1960 },
  GB:  { name: "Packers", city: "Green Bay", color: "#203731", alt: "#FFB612", since: 1960 },
  HOU: { name: "Texans", city: "Houston", color: "#03202F", alt: "#A71930", since: 2002 },
  IND: { name: "Colts", city: "Indianapolis", color: "#002C5F", alt: "#A2AAAD", since: 1960 },
  JAX: { name: "Jaguars", city: "Jacksonville", color: "#006778", alt: "#D7A22A", since: 1995 },
  KC:  { name: "Chiefs", city: "Kansas City", color: "#E31837", alt: "#FFB81C", since: 1960 },
  LV:  { name: "Raiders", city: "Las Vegas", color: "#000000", alt: "#A5ACAF", since: 1960 },
  LAC: { name: "Chargers", city: "Los Angeles", color: "#0080C6", alt: "#FFC20E", since: 1960 },
  LAR: { name: "Rams", city: "Los Angeles", color: "#003594", alt: "#FFA300", since: 1960 },
  MIA: { name: "Dolphins", city: "Miami", color: "#008E97", alt: "#FC4C02", since: 1966 },
  MIN: { name: "Vikings", city: "Minnesota", color: "#4F2683", alt: "#FFC62F", since: 1961 },
  NE:  { name: "Patriots", city: "New England", color: "#002244", alt: "#C60C30", since: 1960 },
  NO:  { name: "Saints", city: "New Orleans", color: "#101820", alt: "#D3BC8D", since: 1967 },
  NYG: { name: "Giants", city: "New York", color: "#0B2265", alt: "#A71930", since: 1960 },
  NYJ: { name: "Jets", city: "New York", color: "#125740", alt: "#FFFFFF", since: 1960 },
  PHI: { name: "Eagles", city: "Philadelphia", color: "#004C54", alt: "#A5ACAF", since: 1960 },
  PIT: { name: "Steelers", city: "Pittsburgh", color: "#101820", alt: "#FFB612", since: 1960 },
  SF:  { name: "49ers", city: "San Francisco", color: "#AA0000", alt: "#B3995D", since: 1960 },
  SEA: { name: "Seahawks", city: "Seattle", color: "#002244", alt: "#69BE28", since: 1976 },
  TB:  { name: "Buccaneers", city: "Tampa Bay", color: "#D50A0A", alt: "#34302B", since: 1976 },
  TEN: { name: "Titans", city: "Tennessee", color: "#0C2340", alt: "#4B92DB", since: 1960 },
  WAS: { name: "Commanders", city: "Washington", color: "#5A1414", alt: "#FFB612", since: 1960 },
};

const DECADES = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const DECADE_START = { "1960s": 1960, "1970s": 1970, "1980s": 1980, "1990s": 1990, "2000s": 2000, "2010s": 2010, "2020s": 2020 };

const POSITIONS = [
  { key: "QB", label: "Quarterback" },
  { key: "RB", label: "Running Back" },
  { key: "WR", label: "Wide Receiver" },
  { key: "WR2", label: "Wide Receiver", pool: "WR" },
  { key: "TE", label: "Tight End" },
  { key: "HC", label: "Head Coach" },
];
