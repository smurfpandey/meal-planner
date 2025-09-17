import { createIcons, icons } from "lucide";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API = {
  async getMeals() {
    const response = await fetch(`${API_BASE_URL}/meals`, {
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

  async deleteMeal(mealId) {
    const response = await fetch(`${API_BASE_URL}/meals/${mealId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
    });
    if (!response.ok) {
      alert(`Failed to delete meal: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  },

  async addMeal(meal) {
    const response = await fetch(`${API_BASE_URL}/meals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
      body: JSON.stringify(meal),
    });

    if (!response.ok) {
      // if status is 409, meal with same name exists
      if (response.status === 409) {
        const data = await response.json();
        alert(data.message);
      } else {
        alert(`Failed to save meal: ${response.status} ${response.statusText}`);
      }
      return;
    }

    return await response.json();
  },

  async saveMeal(meal) {
    const response = await fetch(`${API_BASE_URL}/meals/${meal.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("appAccessToken")}`,
      },
      body: JSON.stringify(meal),
    });
    if (!response.ok) {
      // if status is 409, meal with same name exists
      if (response.status === 409) {
        const data = await response.json();
        alert(data.message);
      } else {
        alert(`Failed to save meal: ${response.status} ${response.statusText}`);
      }
      return;
    }
    return await response.json();
  },
};

export default () => ({
  isLoadingMeals: false,
  isDeletingMeal: false,
  isDishSelectorOpen: false,
  isSavingMeal: false,
  meals: [],

  filteredDishes: [],
  searchDish: "",

  wipMeal: {
    id: undefined,
    name: "",
    dishes: [],
  },
  mealFormError: {},

  init() {
    // searching for the given value
    this.$watch("searchDish", (e) => {
      this.filteredDishes = [];
      Object.values(Alpine.store("app").dishes)
        .filter((el) => {
          var reg = new RegExp(this.searchDish, "gi");
          return el.name.match(reg);
        })
        .forEach((el) => {
          this.filteredDishes.push(el);
        });
    });
  },

  async getMeals() {
    this.isLoadingMeals = true;

    try {
      const apiData = await API.getMeals();
      this.meals = apiData.meals;
      Alpine.store("app").meals = apiData.meals;
    } catch (error) {
      // #TODO: better error display
      console.error("Error loading dishes:", error);
    } finally {
      this.isLoadingMeals = false;
      // Refresh icons after DOM update
      this.$nextTick(() => createIcons({ icons }));
    }
  },

  showSaveMealModal() {
    document.getElementById("addMealModal").showModal();

    this.filteredDishes = Alpine.store("app").dishes;
    this.wipMeal = {
      id: undefined,
      name: "",
      dishes: [],
    };
  },

  removeWipMealDish(index, thisDish) {
    this.wipMeal.dishes.splice(index, 1);

    // find this dish in filteredDishes and unselect it
    const dishIndex = this.filteredDishes.findIndex(
      (d) => d.id === thisDish.id,
    );
    if (dishIndex !== -1) {
      this.filteredDishes[dishIndex].selected = false;
    }
  },
  openDishSelector() {
    this.isDishSelectorOpen = true;
  },
  closeDishSelector() {
    this.isDishSelectorOpen = false;
  },
  // clear search field
  clearSearchDish() {
    this.searchDish = "";
  },

  selectDish(thisDish, index) {
    if (!this.wipMeal.dishes.find((d) => d.id === thisDish.id)) {
      this.wipMeal.dishes.push(thisDish);
      this.filteredDishes[index].selected = true;
      this.clearSearchDish();
    } else {
      // Dish already selected, unselect it
      this.unselectDish(thisDish, index);
      return;
    }
  },

  unselectDish(thisDish, index) {
    const dishIndex = this.wipMeal.dishes.findIndex(
      (d) => d.id === thisDish.id,
    );
    if (dishIndex !== -1) {
      this.wipMeal.dishes.splice(dishIndex, 1);
      this.filteredDishes[index].selected = false;
    }
  },

  async saveMeal() {
    let hasError = false;
    this.mealFormError = { name: false };
    if (!this.wipMeal.name.trim()) {
      this.mealFormError.name = "Meal name is required.";
      hasError = true;
    }

    if (this.wipMeal.dishes.length === 0) {
      this.mealFormError.dishes = "At least one dish must be selected.";
      hasError = true;
    }

    if (hasError) {
      return;
    }

    this.isSavingMeal = true;

    // remove everthing except id, name and dishes from wipMeal
    const mealToSave = {
      id: this.wipMeal.id,
      name: this.wipMeal.name,
      dishes: this.wipMeal.dishes.map((d) => d.id),
    };

    let savedMeal;

    if (mealToSave.id) {
      // Update existing meal
      savedMeal = await API.saveMeal(mealToSave);
    } else {
      // Create new meal
      savedMeal = await API.addMeal(mealToSave);
    }
    this.isSavingMeal = false;

    if (!savedMeal) {
      // #TODO show error to user
      return;
    }
    document.getElementById("addMealModal").close();
    this.wipMeal = { id: undefined, name: "", dishes: [] };
    this.getMeals();
  },

  confirmDeleteMeal(thisMeal) {
    this.wipMeal = thisMeal;
    document.getElementById("alert-dialog-deleteMeal").showModal();
  },

  async deleteMeal() {
    if (!this.wipMeal.id) {
      return;
    }

    this.isDeletingMeal = true;
    await API.deleteMeal(this.wipMeal.id);
    this.isDeletingMeal = false;
    this.wipMeal = { id: undefined, name: "", dishes: [] };
    document.getElementById("alert-dialog-deleteMeal").close();
    this.getMeals();
  },

  editMeal(thisMeal) {
    this.wipMeal = thisMeal;
    // mark all dishes in wipMeal as selected in filteredDishes
    this.filteredDishes = Alpine.store("app").dishes.map((d) => {
      return {
        ...d,
        selected: this.wipMeal.dishes.find((wd) => wd.id === d.id)
          ? true
          : false,
      };
    });
    document.getElementById("addMealModal").showModal();
  },
});
