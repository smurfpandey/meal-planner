import "./style.css";

import { createAuth0Client } from "@auth0/auth0-spa-js";
import Alpine from "alpinejs";
import "basecoat-css/all";
import { allFakers } from "@faker-js/faker";
import { createIcons, icons } from "lucide";

window.Alpine = Alpine;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API = {
  async getMeals() {
    const response = await fetch(`${API_BASE_URL}/meals`);
    if (!response.ok) {
      throw new Error(
        `Failed to load meals: ${response.status} ${response.statusText}`,
      );
    }
    return await response.json();
  },

  async addMeal(meal) {
    const response = await fetch("http://localhost:3000/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meal),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to save meal: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  },

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

Alpine.data("mealPlanner", () => ({
  appState: {
    isLoading: true,
    isAuthenticated: false,
    isOnboarding: false,
    isSavingFamily: false,
    isSavingDish: false,
    isDeletingDish: false,
    isLoadingDishes: false,
  },
  auth0: null,
  meals: [],
  dishes: [],
  isLoadingMeals: false,
  isLoading: false,
  currentWeekOffset: 0,
  user: null,
  mealsError: null,
  family: {
    id: "",
    name: "",
    members: [{ email: "" }],
  },
  familyFormError: {
    name: false,
    members: [],
  },

  dishes: [],
  dishesError: null,

  // WIP
  dish: {
    name: "",
    tags: [],
    id: "",
    description: "",
  },
  dishTag: "",

  dishFormError: {
    name: false,
    tags: false,
    description: false,
  },

  days: [
    {
      key: "monday",
      label: "Monday",
    },
    {
      key: "tuesday",
      label: "Tuesday",
    },
    {
      key: "wednesday",
      label: "Wednesday",
    },
    {
      key: "thursday",
      label: "Thursday",
    },
    {
      key: "friday",
      label: "Friday",
    },
    {
      key: "saturday",
      label: "Saturday",
    },
    {
      key: "sunday",
      label: "Sunday",
    },
  ],
  weeklyPlans: [
    {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {},
      sunday: {},
    },
  ],
  newMeal: {
    name: "",
    type: "",
    mealTime: [],
  },

  renderIcons() {
    createIcons({ icons });
  },

  async init() {
    // Initialize Lucide icons
    this.renderIcons();
    // Initialize Auth0
    await this.initAuth0();
  },

  async initAuth0() {
    try {
      this.auth0 = await createAuth0Client({
        domain: import.meta.env.VITE_AUTH0_DOMAIN,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
        authorizationParams: {
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH_AUDIENCE,
        },
        cacheLocation: "localstorage",
        useRefreshTokens: true,
      });

      // Check if we're returning from Auth0
      const query = window.location.search;
      if (query.includes("code=") && query.includes("state=")) {
        await this.auth0.handleRedirectCallback();
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      // Check auth0 authentication status
      const auth0AuthState = await this.auth0.isAuthenticated();
      if (auth0AuthState) {
        this.user = await this.auth0.getUser();
        await this.loginToApp();
      }
    } catch (error) {
      console.error("Auth0 initialization error:", error);
    } finally {
      this.appState.isLoading = false;
    }
  },

  async loginToApp() {
    // get auth0 access token
    const auth0Token = await this.auth0.getTokenSilently({
      cacheMode: "cache-only",
    });

    if (!auth0Token) {
      return;
    }

    // check if user is authenticated to app backend
    const appToken = localStorage.getItem("appAccessToken");
    if (!appToken) {
      // get app access token from backend
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth0Token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to authenticate with app backend: ${response.status} ${response.statusText}`,
          );
          return;
        }

        const data = await response.json();
        this.families = data.families || [];
        this.userId = data.user.id;
        localStorage.setItem("appAccessToken", data.access_token);
      } catch (error) {
        console.error("Error logging in to app:", error);
      }
    } else {
      // validate the app access token from backend
      try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${appToken}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("appAccessToken");
          this.loginToApp();
          throw new Error(
            `Failed to validate app access token: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        this.userId = data.user.id;
        this.families = data.families || [];
      } catch (error) {
        console.error("Error validating app access token:", error);
        localStorage.removeItem("appAccessToken");
        return;
      }
    }
    this.appState.isAuthenticated = true;

    if (this.families.length === 0) {
      this.appState.isOnboarding = true;
      document.getElementById("createNewFamily").showModal();
    }
  },

  generateRandomFamilyName() {
    const locale = navigator.language || "en-IN";
    const faker = allFakers[locale] || allFakers["en"];
    this.family.name = faker.person.lastName() + " Family";
  },

  addFamilyMember() {
    this.family.members.push({ email: "" });
    this.$nextTick(() => createIcons({ icons }));
  },

  removeFamilyMember(index) {
    if (this.family.members.length > 1) {
      this.family.members.splice(index, 1);
    } else {
      this.family.members[0].email = "";
    }
  },

  async createFamily() {
    // Reset errors
    this.familyFormError = { name: false, members: [] };
    let hasError = false;

    // Validate family name
    if (!this.family.name.trim()) {
      this.familyFormError.name = "Family name is required.";
      hasError = true;
    }

    // Validate member emails
    const emails = [];
    this.family.members.forEach((member, idx) => {
      const email = member.email?.trim();
      if (!email) {
        this.familyFormError.members[idx] = "";
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        this.familyFormError.members[idx] = "Invalid email format.";
        hasError = true;
      } else if (emails.includes(email.toLowerCase())) {
        this.familyFormError.members[idx] = "Duplicate email.";
        hasError = true;
      } else {
        this.familyFormError.members[idx] = "";
        emails.push(email.toLowerCase());
      }
    });

    if (hasError) {
      return;
    }
    // ...existing code...
    this.appState.isSavingFamily = true;

    try {
      const appToken = localStorage.getItem("appAccessToken");
      const response = await fetch(`${API_BASE_URL}/families`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appToken}`,
        },
        body: JSON.stringify(this.family),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create family: ${response.status} ${response.statusText}`,
        );
      }

      // refresh jwt token
      localStorage.removeItem("appAccessToken");
      await this.loginToApp();

      const data = await response.json();
      this.appState.isOnboarding = false;
      document.getElementById("createNewFamily").close();
    } catch (error) {
      console.error("Error creating family:", error);
    } finally {
      this.appState.isSavingFamily = false;
    }
  },

  // Dishes
  async getDishes() {
    this.appState.isLoadingDishes = true;
    this.dishesError = null;

    try {
      const apiData = await API.getDishes();
      this.dishes = apiData.dishes;
    } catch (error) {
      this.dishesError = error.message;
      console.error("Error loading dishes:", error);
    } finally {
      this.appState.isLoadingDishes = false;
      // Refresh icons after DOM update
      this.$nextTick(() => createIcons({ icons }));
    }
  },

  generateRandomDishName() {
    const locale = navigator.language || "en-IN";
    const faker = allFakers[locale] || allFakers["en"];
    this.dish.name = faker.food.dish();
  },

  addDishTag() {
    if (this.dishTag.trim() && !this.dish.tags.includes(this.dishTag.trim())) {
      this.dish.tags.push(this.dishTag.trim());
      this.dishTag = "";
      this.$nextTick(() => createIcons({ icons }));
    }
  },

  removeDishTag(index) {
    this.dish.tags.splice(index, 1);
  },

  async saveDish() {
    this.dishFormError = { name: false, tags: false, description: false };
    let hasError = false;
    if (!this.dish.name.trim()) {
      this.dishFormError.name = "Dish name is required.";
      hasError = true;
    }

    if (hasError) {
      return;
    }

    this.appState.isSavingDish = true;
    let savedDish;
    if (this.dish.id) {
      // Update existing dish
      savedDish = await API.saveDish(this.dish);
    } else {
      // Create new dish
      savedDish = await API.addDish(this.dish);
    }

    if (!savedDish) {
      this.appState.isSavingDish = false;
      // #TODO show error to user
      return;
    }

    document.getElementById("addDishModal").close();
    this.dish = { name: "", tags: [], description: "", id: "" };
    this.appState.isSavingDish = false;
    this.getDishes();
  },

  confirmDeleteDish(deleteDish) {
    this.dish.id = deleteDish.id;
    this.dish.name = deleteDish.name;
    document.getElementById("alert-dialog-deleteDish").showModal();
  },

  async deleteDish() {
    if (!this.dish.id) {
      return;
    }
    this.appState.isDeletingDish = true;
    const isDeleted = await API.deleteDish(this.dish.id);
    this.appState.isDeletingDish = false;
    if (!isDeleted) {
      // #TODO show error to user
      return;
    }
    this.dish = { name: "", tags: [], description: "", id: "" };
    document.getElementById("alert-dialog-deleteDish").close();
    this.getDishes();
  },

  editDish(editDish) {
    this.dish.id = editDish.id;
    this.dish.name = editDish.name;
    this.dish.description = editDish.description;

    this.showAddDishModal();
  },

  getMealWeekLabel() {
    if (this.currentWeekOffset === 0) {
      return "Current Week";
    } else if (this.currentWeekOffset === -1) {
      return "Last Week";
    } else {
      return `${Math.abs(this.currentWeekOffset)} weeks ago`;
    }
  },

  navigateWeek(direction) {
    this.currentWeekOffset += direction;
    // Ensure we don't go into future weeks
    if (this.currentWeekOffset > 0) {
      this.currentWeekOffset = 0;
    }
    // Initialize week plan if it doesn't exist
    if (!this.weeklyPlans[this.currentWeekOffset]) {
      this.weeklyPlans[this.currentWeekOffset] = {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        saturday: {},
        sunday: {},
      };
    }
  },

  async loadMeals() {
    this.isLoadingMeals = true;
    this.mealsError = null;

    try {
      const apiData = await API.getMeals();
      this.meals = apiData.meals;
    } catch (error) {
      this.mealsError = error.message;
      console.error("Error loading meals:", error);
    } finally {
      this.isLoadingMeals = false;
      // Refresh icons after DOM update
      this.$nextTick(() => createIcons({ icons }));
    }
  },

  assignMealToPlan(day, mealSlot, mealId) {
    if (!this.weeklyPlans[0]) {
      this.weeklyPlans[0] = {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        saturday: {},
        sunday: {},
      };
    }

    if (mealId === "remove" || mealId === "") {
      delete this.weeklyPlans[0][day][mealSlot];
    } else {
      const meal = this.meals.find((m) => m.id === mealId);
      if (meal) {
        this.weeklyPlans[0][day][mealSlot] = meal;
      }
    }
  },

  getMealsByMealTime(mealTime) {
    return this.meals.filter((meal) => meal.mealTime.includes(mealTime));
  },
  isPlanEmpty() {
    const currentPlan = this.getCurrentWeekPlan();
    return this.days.every(
      (day) =>
        !currentPlan[day["key"]].breakfast &&
        !currentPlan[day["key"]].lunch &&
        !currentPlan[day["key"]].dinner,
    );
  },

  getCurrentWeekPlan() {
    return (
      this.weeklyPlans[this.currentWeekOffset] || {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        saturday: {},
        sunday: {},
      }
    );
  },

  async startLoginWithAuth0() {
    try {
      await this.auth0.loginWithRedirect();
    } catch (error) {
      console.error("Login error:", error);
    }
  },

  showAddMealModal() {
    document.getElementById("addMealModal").showModal();
  },

  showAddDishModal() {
    document.getElementById("addDishModal").showModal();
  },
}));

Alpine.start();
