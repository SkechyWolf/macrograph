import { ApiClient } from "@twurple/api";
import { createRoot, createEffect, createMemo, createSignal } from "solid-js";
import { accessToken, authProvider } from "./auth";
import pkg from "./pkg";
import { map } from "../../utils";
import { types, Option } from "../../types";

const { apiClient, user } = createRoot(() => {
  const apiClient = createMemo(
    () => map(authProvider(), (p) => new ApiClient({ authProvider: p })),
    null
  );

  const getUser = async () => {
    const token = accessToken();
    const client = apiClient();

    if (!client || !token) return null;

    const { userId, userName } = await client.getTokenInfo();

    if (!userId || !userName) return null;
    else
      return {
        id: userId,
        name: userName,
        token,
      };
  };

  const [user, setUser] = createSignal<Awaited<
    ReturnType<typeof getUser>
  > | null>(null);

  createEffect(() => getUser().then(setUser));

  return { apiClient, user };
});

export { apiClient, user };

const api = () => {
  const client = Option.new(apiClient());
  const u = Option.new(user());

  return client.andThen((client) =>
    u.map((user) => ({
      client,
      user,
    }))
  );
};

pkg.createNonEventSchema({
  name: "Ban User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
    t.dataInput({
      name: "Duration",
      id: "duration",
      type: types.int(),
    });
    t.dataInput({
      name: "Reason",
      id: "reason",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.moderation.banUser(user.id, user.id, {
      user: ctx.getInput("userId"),
      duration: ctx.getInput("duration"),
      reason: ctx.getInput("reason"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Unban User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.moderation.unbanUser(user.id, user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Add Moderator",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.moderation.addModerator(user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Remove Moderator",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.moderation.removeModerator(user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Delete Chat message",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Message ID",
      id: "messageId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.moderation.deleteChatMessages(
      user.id,
      user.id,
      ctx.getInput("messageId")
    );
  },
});

pkg.createNonEventSchema({
  name: "Create Clip",
  variant: "Exec",
  generateIO: (t) => {
    t.dataOutput({
      name: "Clip ID",
      id: "clipId",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    let clipId = await client.clips.createClip({
      channel: user.id,
    });

    ctx.setOutput("clipId", clipId);
  },
});

pkg.createNonEventSchema({
  name: "Check User Subscription",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Is Subscribed",
      id: "subbed",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Tier",
      id: "tier",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifted",
      id: "gifted",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Gifter Name",
      id: "gifterName",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifter Display Name",
      id: "gifterDisplayName",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifter ID",
      id: "gifterId",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    let data = await client.subscriptions.getSubscriptionForUser(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("subbed", data !== null);

    if (!data) return;

    ctx.setOutput("tier", data.tier);
    ctx.setOutput("gifted", data.isGift);
    ctx.setOutput("gifterName", data.gifterName);
    ctx.setOutput("gifterDisplayName", data.gifterDisplayName);
    ctx.setOutput("gifterId", data.gifterId);
  },
});

pkg.createNonEventSchema({
  name: "Check User Follow",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Following",
      id: "following",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    let data = await client.channels.getChannelFollowers(
      user.id,
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("following", data?.data.length === 1);
  },
});

pkg.createNonEventSchema({
  name: "Check User VIP",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Vip",
      id: "vip",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    let data = await client.channels.checkVipForUser(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("vip", data);
  },
});

pkg.createNonEventSchema({
  name: "Check User Mod",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Moderator",
      id: "moderator",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    let data = await client.moderation.checkUserMod(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("moderator", data);
  },
});

pkg.createNonEventSchema({
  name: "Create Custom Redemption",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Title",
      id: "title",
      type: types.string(),
    });
    t.dataInput({
      name: "Cost",
      id: "cost",
      type: types.int(),
    });
    t.dataInput({
      name: "Prompt",
      id: "prompt",
      type: types.string(),
    });
    t.dataInput({
      name: "Enabled",
      id: "isEnabled",
      type: types.bool(),
    });
    t.dataInput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataInput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataInput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.int(),
    });
    t.dataInput({
      name: "Skip Redemption Queue",
      id: "autoFulfill",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Success",
      id: "success",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: types.string(),
    });
    t.dataOutput({
      name: "Redemption ID",
      id: "redemptionId",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, client } = api().unwrap();

    try {
      let data = await client.channelPoints.createCustomReward(user.id, {
        title: ctx.getInput("title"),
        cost: ctx.getInput("cost"),
        prompt: ctx.getInput("prompt"),
        isEnabled: ctx.getInput("isEnabled"),
        backgroundColor: ctx.getInput("backgroundColor"),
        userInputRequired: ctx.getInput("userInputRequired"),
        maxRedemptionsPerStream: ctx.getInput("maxRedemptionsPerStream"),
        maxRedemptionsPerUserPerStream: ctx.getInput(
          "maxRedemptionsPerUserPerStream"
        ),
        globalCooldown: ctx.getInput("globalCooldown"),
        autoFulfill: ctx.getInput("autoFulfill"),
      });
      ctx.setOutput("success", true);
      ctx.setOutput("redemptionId", data?.id);
    } catch (error: any) {
      ctx.setOutput("success", false);
      ctx.setOutput("errorMessage", (JSON.parse(error.body) as any).message);
    }
  },
});

pkg.createNonEventSchema({
  name: "Follower Only Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "delay",
      name: "Delay (minutes)",
      type: types.int(),
    });
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.chat.updateSettings(user.id, user.id, {
      followerOnlyModeEnabled: ctx.getInput("enabled"),
      followerOnlyModeDelay: ctx.getInput("delay"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Slow Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "delay",
      name: "Delay (seconds)",
      type: types.int(),
    });
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.chat.updateSettings(user.id, user.id, {
      slowModeEnabled: ctx.getInput("enabled"),
      slowModeDelay: ctx.getInput("delay"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Sub Only Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.chat.updateSettings(user.id, user.id, {
      subscriberOnlyModeEnabled: ctx.getInput("enabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "R9K Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.chat.updateSettings(user.id, user.id, {
      uniqueChatModeEnabled: ctx.getInput("enabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Shoutout User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, client } = api().unwrap();

    client.chat.shoutoutUser(user.id, ctx.getInput("userId"), user.id);
  },
});