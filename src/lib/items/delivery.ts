/**
 * How an item ships. The dealer picks this when listing. It sets the product weight band in Shopify, which is what
 * each store's shipping rates key off, so the buyer sees the right delivery charge at checkout. At the unit it sets
 * the parcel defaults.
 */
export type Delivery = "small" | "medium" | "large" | "furniture";
export const DELIVERY: { id: Delivery; label: string; hint: string; shopifyKg: number; format: "largeLetter" | "smallParcel" | "mediumParcel" | "courier"; grams: number }[] = [
  { id: "small", label: "Small, posts easily", hint: "Jewellery, ceramics, silver, books. Up to a shoebox.", shopifyKg: 1, format: "smallParcel", grams: 800 },
  { id: "medium", label: "Medium parcel", hint: "A lamp, a clock, a box of glass. Up to 20 kg, under 61 cm.", shopifyKg: 5, format: "mediumParcel", grams: 4000 },
  { id: "large", label: "Large, needs a courier", hint: "A mirror, a chair, a painting. Goes by courier, costs more.", shopifyKg: 15, format: "courier", grams: 15000 },
  { id: "furniture", label: "Furniture, collect or quote", hint: "Too big to parcel. Buyer collects from the centre or we quote delivery after checkout.", shopifyKg: 50, format: "courier", grams: 50000 },
];
export const deliveryOf = (id: string | null | undefined) => DELIVERY.find((d) => d.id === id) ?? DELIVERY[0];
