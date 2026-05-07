import axios from "axios";

export async function fetchResearch(pattern: string) {
  try {
    const query = encodeURIComponent(pattern + " dark pattern UI");
    const url = `http://export.arxiv.org/api/query?search_query=all:${query}&max_results=3`;

    const res = await axios.get(url);
    return res.data.slice(0, 300); // small summary
  } catch (e) {
    return "No research found";
  }
}