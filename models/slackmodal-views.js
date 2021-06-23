var views = {};
module.exports = views;

var commonController = require("../controllers/common-controller");

views.allCommands = function(channelId, message = null , image = null) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "resourcebot_master_modal",
    title: {
      type: "plain_text",
      text: "Appdemo Bot"
    },
    blocks: [
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "add_option",
            text: {
              type: "plain_text",
              text: ":heavy_plus_sign:   Add Resource",
              emoji: true
            }
          },
          {
            type: "button",
            action_id: "remove_option",
            text: {
              type: "plain_text",
              text: ":heavy_minus_sign:   Remove Resource",
              emoji: true
            }
          },
          {
            type: "button",
            action_id: "claim_option",
            text: {
              type: "plain_text",
              text: ":mega:   Claim Resource"
            }
          },
          {
            type: "button",
            action_id: "release_option",
            text: {
              type: "plain_text",
              text: ":white_check_mark:   Release Resource",
              emoji: true
            }
          },
          {
            type: "button",
            action_id: "list_option",
            text: {
              type: "plain_text",
              text: ":scroll:   List Resources"
            }
          }
        ]
      }
    ],
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };

  if (message) {
    let additionaData = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      },
      {
        type: "divider"
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Perform more action:",
          emoji: true
        }
      }
    ];

    if (image) {
      additionaData[0].accessory = {
        type: "image",
        image_url: image,
        alt_text: "Reaction"
      };
    }

    // obj.blocks.unshift(additionaData)
    obj.blocks = additionaData.concat(obj.blocks);
  }
  return obj;
};

views.add = function(channelId) {
  return {
    type: "modal",
    // View identifier
    callback_id: "modal_add_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Add"
    },
    blocks: [
      {
        type: "input",
        block_id: "view_add_block-0",
        label: {
          type: "plain_text",
          text: "Please enter the name of resource you want to add."
        },
        element: {
          type: "plain_text_input",
          action_id: "view_add_resourceName-0"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": " "
        },
        "accessory": {
          "type": "button",
          "action_id": "add_new_option",
          "text": {
            "type": "plain_text",
            "text": ":heavy_plus_sign: Add More",
            "emoji": true
          }
        }
      }
    ],
    
    submit: {
      type: "plain_text",
      text: "Add"
    },
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };
};

views.addNew = function(initialView){
  let originalView = JSON.parse(JSON.stringify(initialView))
  let newIndex = originalView.blocks.length - 1
  let newInput = {
        type: "input",
        block_id: `view_add_block-${newIndex}`,
        label: {
          type: "plain_text",
          text: " "
        },
        element: {
          type: "plain_text_input",
          action_id: `view_add_resourceName-${newIndex}`
        },
        optional: true
  };
  originalView.blocks.splice(newIndex, 0, newInput);
  
  let updatedView = {
    type: "modal",
    // View identifier
    callback_id: "modal_add_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Add"
    },
    blocks: [...originalView.blocks],
    
    submit: {
      type: "plain_text",
      text: "Add"
    },
    //Channel ID is being passed as private_metadata
    private_metadata: initialView.private_metadata
  }
  
  return updatedView
}

views.claim = function({channelId, listOfAvailableOptions, listOfMyOptions, initialOption}) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "modal_claim_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Claim"
    },
    blocks: [
      {
        type: "input",
        block_id: "block_claim_resourceName",
        element: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Resource",
            emoji: true
          },
          options: [],
          action_id: "claim_resourceName"
        },
        label: {
          type: "plain_text",
          text: "Select a resource to claim",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "block_claim_duration",
        element: {
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "No. of Days"
          },
          action_id: "claim_duration"
        },
        hint: {
          type: "plain_text",
          text:
            "Must be a number. If it is not a number or empty, it will select the default number of days(ie. 2 days)"
        },
        label: {
          type: "plain_text",
          text: "Duration",
          emoji: true
        },
        optional: true
      },
      {
        type: "input",
        block_id: "block_claim_description",
        element: {
          type: "plain_text_input",
          multiline: true,
          action_id: "claim_description",
          placeholder: {
            type: "plain_text",
            text:
              "Enter some description to let others know why you are claiming this resource",
            emoji: true
          }
        },
        label: {
          type: "plain_text",
          text: "Reason",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Claim"
    },
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };

  if (listOfAvailableOptions || listOfMyOptions) {
    let additionaData = [];

    for (let i = 0; i < listOfAvailableOptions.length; i++) {
      let obj = {
        text: {
          type: "plain_text",
          text: listOfAvailableOptions[i]
        },
        value: listOfAvailableOptions[i]
      };
      additionaData.push(obj);
    }
    
    for (let i = 0; i < listOfMyOptions.length; i++) {
      let obj = {
        text: {
          type: "plain_text",
          text: `${listOfMyOptions[i]} (Owned by you)`
        },
        value: listOfMyOptions[i]
      };
      additionaData.push(obj);
    }

    // obj.blocks.unshift(additionaData)
    obj.blocks[0].element.options = additionaData;
  }

  if (initialOption) {
    let text = initialOption;
    if(listOfMyOptions.includes(initialOption)){
      text = initialOption + " (Owned by you)"
    }
    obj.blocks[0].element.initial_option = {
      text: {
        type: "plain_text",
        text: text
      },
      value: initialOption
    };
  }

  return obj;
};

views.remove = function(channelId, listOfOptions) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "modal_remove_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Remove"
    },
    blocks: [
      {
        type: "input",
        block_id: "block_remove_resourceName",
        element: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Resource",
            emoji: true
          },
          options: [],
          action_id: "remove_resourceName"
        },
        label: {
          type: "plain_text",
          text: "Select a resource to remove",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Remove"
    },
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };

  if (listOfOptions) {
    let additionaData = [];

    for (let i = 0; i < listOfOptions.length; i++) {
      let obj = {
        text: {
          type: "plain_text",
          text: listOfOptions[i]
        },
        value: listOfOptions[i]
      };
      additionaData.push(obj);
    }

    // obj.blocks.unshift(additionaData)
    obj.blocks[0].element.options = additionaData;
  }
  return obj;
};

views.release = function(channelId, listOfOptions) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "modal_release_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Release"
    },
    blocks: [
      {
        type: "input",
        block_id: "block_release_resourceName",
        element: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Resource",
            emoji: true
          },
          options: [],
          action_id: "release_resourceName"
        },
        label: {
          type: "plain_text",
          text: "Select a resource you want to release",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Release"
    },
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };

  if (listOfOptions) {
    let additionaData = [];

    for (let i = 0; i < listOfOptions.length; i++) {
      let obj = {
        text: {
          type: "plain_text",
          text: listOfOptions[i]
        },
        value: listOfOptions[i]
      };
      additionaData.push(obj);
    }

    // obj.blocks.unshift(additionaData)
    obj.blocks[0].element.options = additionaData;
  }
  return obj;
};

views.list = function(channelId, listOfAvalaibleOptions, listOfClaimedOptions, user) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "modal_list_submit",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - List"
    },
    submit: {
      type: "plain_text",
      text: "Back"
    },
    blocks: [],
    //Channel ID is being passed as private_metadata
    private_metadata: channelId
  };

  let AvailableHeader = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Available Resources",
        emoji: true
      }
    },
    {
      type: "divider"
    }
  ];

  let ClaimedHeader = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Claimed Resources",
        emoji: true
      }
    },
    {
      type: "divider"
    }
  ];

  let AvailableList = [];
  if (listOfAvalaibleOptions) {
    for (let i = 0; i < listOfAvalaibleOptions.length; i++) {
      let obj = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${i + 1}. ${listOfAvalaibleOptions[i]}*`
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: ":pencil: Claim",
                emoji: true
              },
              value: `${listOfAvalaibleOptions[i]}`
            }
          ],
          action_id: `list_claim`
        }
      };
      AvailableList.push(obj);
    }
  }

  let ClaimedList = [];
  if (listOfClaimedOptions) {
    for (let i = 0; i < listOfClaimedOptions.length; i++) {
      let obj1 = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${i + 1}. ${listOfClaimedOptions[i].name}*`
        }
      };
      
      if(user == listOfClaimedOptions[i].owner){
        obj1.accessory = {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: ":white_check_mark: Release",
                emoji: true
              },
              value: `Release_${listOfClaimedOptions[i].name}`
            },
            {
              text: {
                type: "plain_text",
                text: ":pencil: Update",
                emoji: true
              },
              value: `Update_${listOfClaimedOptions[i].name}`
            }
          ],
          action_id: `list_claimed_overflow`
        }
      }

      let obj2 = {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<@${listOfClaimedOptions[i].owner}>. - ${listOfClaimedOptions[i].message} `
          }
        ]
      };

      let obj3 = {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*From*: ${commonController.getSlackTimeString(
              listOfClaimedOptions[i].claimTime
            )}`
          },
          {
            type: "mrkdwn",
            text: `*Till*: ${commonController.getSlackTimeString(
              listOfClaimedOptions[i].claimTime +
                listOfClaimedOptions[i].duration
            )}`
          }
        ]
      };

      let obj4 = {
        type: "divider"
      };

      ClaimedList.push(obj1);
      ClaimedList.push(obj2);
      ClaimedList.push(obj3);
      ClaimedList.push(obj4);
    }
  }
  
  let AvailableContent = listOfAvalaibleOptions.length ? AvailableHeader.concat(AvailableList) : [];
  let CliamedContent = listOfClaimedOptions.length ? ClaimedHeader.concat(ClaimedList) : []
  
  obj.blocks = AvailableContent.concat(CliamedContent);

  return obj;
};

views.attachments = function(resource_name){
  let obj = {
    blocks: [
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `${resource_name} - *Claim or Release?*`
          }
        ]
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            action_id: "attachment_claim",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "Claim"
            },
            "style": "primary",
            "value": resource_name
          },
          {
            "type": "button",
            action_id: "attachment_release",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "Release"
            },
            "style": "danger",
            "value": resource_name
          }
        ]
      }
    ]
  }
  
  return obj
}

views.error = function(text, image) {
  let obj = {
    type: "modal",
    // View identifier
    callback_id: "resourcebot_error_modal",
    title: {
      type: "plain_text",
      text: "Appdemo Bot - Error"
    },
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": text
        }
      }
    ]
  };
  return obj;
};