require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 5000;

// Reading frontend origin from env
const FRONT_URL = process.env.REACT_APP_FRONT_URL;
if (!FRONT_URL) {
  console.error('Missing REACT_APP_FRONT_URL in environment');
  process.exit(1);
}

// strict CORS
const corsOptions = {
  origin: FRONT_URL,
  credentials: true,
  methods: ['GET','OPTIONS'],
  allowedHeaders: ['Content-Type']
};

// apply CORS globally 
app.use(cors(corsOptions));
app.use(express.json());

const CF_API = 'https://codeforces.com/api';

// dbg
app.get('/', (_req, res) => {
  res.send('AfterSolve server is running');
});

// main
app.get('/api/user/:handle/unsolved', async (req, res) => {
  const { handle } = req.params;
  try {
    // autheticate user
    await axios.get(`${CF_API}/user.info`, { params: { handles: handle } });

    // get all submissions
    const { data: subsData } = await axios.get(`${CF_API}/user.status`, {
      params: { handle, from: 1, count: 100000 }
    });
    const submissions = subsData.result;

    // building solved set & verdicts
    const solved   = new Set();
    const verdicts = {};
    submissions.forEach(sub => {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      verdicts[key] = sub.verdict;
      if (sub.verdict === 'OK') solved.add(key);
    });

    // get contest IDs from ACTUAL contest participation only
    const submittedIds = new Set(
      submissions
        .filter(s => s.author.participantType === 'CONTESTANT')
        .map(s => s.problem.contestId)
    );
    const contestIds = submittedIds;  // only contests where user competed

    // get contest metadata
    const { data: contestsData } = await axios.get(`${CF_API}/contest.list`, {
      params: { gym: false }
    });
    const nameMap = {}, timeMap = {};
    contestsData.result.forEach(c => {
      if (contestIds.has(c.id)) {
        nameMap[c.id] = c.name;
        timeMap[c.id] = c.startTimeSeconds * 1000;
      }
    });

    // fetch full problemset
    const { data: problemsData } = await axios.get(
      `${CF_API}/problemset.problems`
    );
    const allProblems = problemsData.result.problems;

    // filter unsolved
    const unsolved = allProblems
      .filter(p => contestIds.has(p.contestId))
      .filter(p => !solved.has(`${p.contestId}-${p.index}`))
      .map(p => ({
        contestId:   p.contestId,
        contestName: nameMap[p.contestId] || null,
        index:       p.index,
        name:        p.name,
        rating:      typeof p.rating === 'number' ? p.rating : null,
        tags:        p.tags,
        time:        timeMap[p.contestId] || null,
        status:      verdicts[`${p.contestId}-${p.index}`] || 'Unattempted'
      }));

    res.json({ unsolved });
  } catch (err) {
    console.error('Error:', err.message);
    const status  = err.response?.status || 500;
    const comment = err.response?.data?.comment || err.message;

    if (status === 429) {
      return res
        .status(429)
        .json({ error: 'Rate limit exceeded. Try again in a minute.' });
    }
    if (comment.includes('The API is disabled')) {
      return res
        .status(503)
        .json({ error: 'Codeforces API unavailable. Try again later.' });
    }
    res.status(status).json({ error: comment });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
