export interface Ingredient {
  product: string;
  amount: number;
  unit: string;
  type: 'Dairy' | 'Meat' | 'Parve';
}