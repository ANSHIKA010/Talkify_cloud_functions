"use strict";

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onConversationCreated = functions
    .firestore
    .document("Conversations/{conversationID}")
    .onCreate((snapshot, context) => {
      const data = snapshot.data();
      const conversationID = context.params.conversationID;
      if (data) {
        const members = data.members;
        for (let index = 0; index < members.length; index++) {
          const currentUserID = members[index];
          const remainingUserIDs = members
              .filter((u) => u !== currentUserID);
          remainingUserIDs.forEach((m) => {
            return admin
                .firestore()
                .collection("Users")
                .doc(m)
                .get()
                .then((_doc) => {
                  const userData = _doc.data();
                  if (userData) {
                    return admin
                        .firestore()
                        .collection("Users")
                        .doc(currentUserID)
                        .collection("Conversations")
                        .doc(m)
                        .create({
                          "conversationID": conversationID,
                          "image": userData.image,
                          "name": userData.name,
                          "unseenCount": 0,
                        });
                  }
                  return null;
                }).catch(() => {
                  return null;
                });
          });
        }
      }
      return null;
    });

exports.onConversationUpdated = functions
    .firestore
    .document("Conversations/{conversationID}")
    .onUpdate((change, context) => {
      const data = change.after.data();
      if (data) {
        const members = data.members;
        const lastMessage = data.messages[data.messages.length-1];
        for (let index = 0; index<members.length; index++) {
          const currentUserID = members[index];
          const remainingUserIDs = members.filter((u) => u!== currentUserID);
          remainingUserIDs.forEach((u) => {
            return admin.firestore()
                .collection("Users")
                .doc(currentUserID)
                .collection("Conversations").doc(u).update({
                  "lastMessage": lastMessage.message,
                  "timestamp": lastMessage.timestamp,
                  "type": lastMessage.type,
                  "unseenCount": admin.firestore.FieldValue.increment(1),
                });
          });
        }
      }
      return null;
    });

