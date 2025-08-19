import "./style.css";

import { createAuth0Client } from "@auth0/auth0-spa-js";
import Alpine from "alpinejs";
import "basecoat-css/all";
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
};

Alpine.data("mealPlanner", () => ({
  activeTab: "home",
  auth0: null,
  meals: [],
  dishes: [],
  isLoadingMeals: false,
  isLoading: false,
  currentWeekOffset: 0,
  user: null,
  isAuthenticated: false,
  mealsError: null,
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

  async init() {
    // Initialize Lucide icons
    createIcons({ icons });
    // Initialize Auth0
    this.isLoading = true;
    await this.initAuth0();
  },

  async initAuth0() {
    try {
      this.auth0 = await createAuth0Client({
        domain: import.meta.env.VITE_AUTH0_DOMAIN,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
        authorizationParams: {
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
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

      // Check authentication status
      this.isAuthenticated = await this.auth0.isAuthenticated();
      if (this.isAuthenticated) {
        this.user = await this.auth0.getUser();
        await this.loginToApp();
      }
    } catch (error) {
      console.error("Auth0 initialization error:", error);
    } finally {
      this.isLoading = false;
    }
  },

  async loginToApp() {
    // get auth0 access token
    const auth0Token = await this.auth0.getTokenSilently({
      cacheMode: "cache-only",
    });

    // login to the app backend
    console.log("Auth0 Token:", auth0Token);
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
