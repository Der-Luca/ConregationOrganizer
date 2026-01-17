import { API } from "../../api";
import { useEffect, useState } from "react";

export default function UserCarts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    API.get("/carts").then(res => setItems(res.data));
  }, []);

  return (
    <div>
      <h1>User – Carts</h1>
      <ul>
        {items.map(c => <li key={c.id}>{c.name}</li>)}
      </ul>
    </div>
  );
}
