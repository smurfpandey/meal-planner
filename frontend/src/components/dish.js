import { allFakers } from "@faker-js/faker";
import { createIcons, icons } from "lucide";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API = {
  async getDishes() {
    const response = await fetch(`${API_BASE_URL}/dishes`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load dishes: ${response.status} ${response.statusText}`,
      );
    }
    return await response.json();
  },

  async addDish(dish) {
    const response = await fetch(`${API_BASE_URL}/dishes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
      body: JSON.stringify(dish),
    });

    if (!response.ok) {
      // if status is 409, dish with same name exists
      if (response.status === 409) {
        const data = await response.json();
        alert(data.message);
      } else {
        alert(`Failed to save dish: ${response.status} ${response.statusText}`);
      }
      return;
    }

    return await response.json();
  },

  async deleteDish(dishId) {
    const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
    });

    if (!response.ok) {
      alert(`Failed to delete dish: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  },

  async saveDish(dish) {
    const response = await fetch(`${API_BASE_URL}/dishes/${dish.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
      body: JSON.stringify(dish),
    });

    if (!response.ok) {
      // if status is 409, dish with same name exists
      if (response.status === 409) {
        const data = await response.json();
        alert(data.message);
      } else {
        alert(
          `Failed to update dish: ${response.status} ${response.statusText}`,
        );
      }
      return;
    }

    return await response.json();
  },
};

export default () => ({
  isLoadingDishes: false,
  dishesError: null,
  dishes: [],

  generateRandomDishName() {
    const locale = navigator.language || "en-IN";
    const faker = allFakers[locale] || allFakers["en"];
    this.dish.name = faker.food.dish();
  },

  async getDishes() {
    this.isLoadingDishes = true;
    this.dishesError = null;

    try {
      const apiData = await API.getDishes();
      this.dishes = apiData.dishes;
      Alpine.store("app").dishes = this.dishes;
    } catch (error) {
      this.dishesError = error.message;
      console.error("Error loading dishes:", error);
    } finally {
      this.isLoadingDishes = false;
      // Refresh icons after DOM update
      this.$nextTick(() => createIcons({ icons }));
    }
  },
});
