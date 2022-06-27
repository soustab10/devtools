import { useEffect, useState } from "react";

// TODO Fetch this data from the server
const dummyTypeaheadsData = ["body", "console", "document", "window"];
const dummyLookupService = {
  search(string: string, callback: (results: Array<string> | null) => void): void {
    setTimeout(() => {
      const results = dummyTypeaheadsData.filter(mention =>
        mention.toLowerCase().includes(string.toLowerCase())
      );
      if (results.length === 0) {
        callback(null);
      } else {
        callback(results);
      }
    }, 500);
  },
};

const mentionsCache = new Map();

// TODO Connect to Replay protocol
export default function useTypeaheadLookupService(token: string) {
  const [results, setResults] = useState<Array<string> | null>(null);

  useEffect(() => {
    const cachedResults = mentionsCache.get(token);
    if (cachedResults === null) {
      return;
    } else if (cachedResults !== undefined) {
      setResults(cachedResults);
      return;
    }

    mentionsCache.set(token, null);

    dummyLookupService.search(token, newResults => {
      mentionsCache.set(token, newResults);
      setResults(newResults);
    });
  }, [token]);

  return results;
}
