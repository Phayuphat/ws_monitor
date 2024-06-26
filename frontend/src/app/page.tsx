"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  Table,
  Form,
  Select,
  Popconfirm,
  Popover,
  Upload,
  message,
  Image,
  Tooltip,
  Typography,
} from "antd";
import FormItem from "antd/es/form/FormItem";
import {
  UploadOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import type * as antd from "antd";
import environment from "@/app/utils/environment";
import axiosInstance from "@/app/utils/axios";

const App: React.FC = () => {
  const { Search } = Input;
  const [form] = Form.useForm();
  const [LineName, setLineName] = useState<any>([]);
  const [PartNo, setPartNo] = useState<any>([]);
  const [Category, setCategory] = useState<any>([]);

  const [MaxId, setMaxId] = useState<number>(0);
  const [Data, setData] = useState<Item[]>([]);
  const [AddRowClick, setAddRowClick] = useState(false);
  const [EditingKey, setEditingKey] = useState("");
  const [UploadList, setUploadList] = useState<antd.UploadFile[]>([]);
  const [DefaultImage, setDefultImage] = useState<any>([]);



  //********************** set time thailand ***************************
  const currentDate = new Date();
  const time_thai = `${String(currentDate.getDate()).padStart(2, "0")} ${
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][currentDate.getMonth()]
  } ${currentDate.getFullYear()} ${String(currentDate.getHours()).padStart(
    2,
    "0"
  )}: ${String(currentDate.getMinutes()).padStart(2, "0")}: ${String(
    currentDate.getSeconds()
  ).padStart(2, "0")}`;

  //**********************API response (get_linename)**************************
  const fetch_linename = async () => {
    
    try {
      const response = await axiosInstance.get("/commons/get_linename");
      if (response.status === 200) {
        setLineName(response.data);
        console.log("linename", response.data)
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch_linename();
  }, []);

  //**********************API response (get_part_number)**************************
  const LineNameChange = async (value: number) => {
    try {
      const response_part_no = await axiosInstance.get(
        `/commons/get_part_no?line_id=${value}`
      );
      if (response_part_no.status === 200) {
        setPartNo(response_part_no.data);
        console.log(response_part_no.data)
      }
    } catch (err) {}
  };

  // useEffect(() => {
  //   if (form.getFieldValue("LineName") === undefined) {
  //     form.resetFields(["Part Number"]);
  //   } else {
  //     form.resetFields(["Part Number"]);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [form.getFieldValue("LineName")]);


  const PartNoChange = async (value: string) => {
    try {
      const response_catrgory = await axiosInstance.get("/commons/get_category");

      if (response_catrgory.status === 200) {
        setCategory(response_catrgory.data);
        console.log(response_catrgory.data)
      }
    } catch (err) {}
  };






  //********************** edit func on table ***************************
  const isEditing = (record: Item) => record.key === EditingKey;

  //edit part_number and plc_data only
  const edit = (record: Partial<Item> & { key: React.Key }) => {
    form.setFieldsValue({
      part_no: "",
      plc_data: "",
      image_path: record.image_path,
      ...record,
    });
    setEditingKey(record.key);
  };

  const cancel = async (record: Item) => {
    setEditingKey("");
  };

  //save all data in 1 row to database
  const savetoDb = async (savedItem: any, filesPath: any) => {
    savedItem.image_path = filesPath;
    setDefultImage(savedItem.image_path);

    const line_id = form.getFieldValue("LineName");
    const process_id = form.getFieldValue("Process");
    const upsertItem = {
      line_id: line_id,
      process_id: process_id,
      part_no: savedItem.part_no,
      plc_data: savedItem.plc_data,
      image_path: savedItem.image_path,
      update_at: time_thai,
    };

    const editItem = {
      id: savedItem.id,
      line_id: line_id,
      process_id: process_id,
      part_no: savedItem.part_no,
      plc_data: savedItem.plc_data,
      image_path: savedItem.image_path,
      update_at: time_thai,
    };

    //if click add_row_click do post , if not do update
    if (AddRowClick) {
      post_edit_data(upsertItem);
      setAddRowClick(false); // Reset the flag after processing
    } else {
      update_row(editItem);
    }
  };
  // TODO recheck  this function (saveDB to setNewData)
  //func. save row
  const save = async (key: React.Key) => {
    try {
      const row = await form.validateFields();
      const newData = [...new Set(Data)];
      const index = newData.findIndex((item) => key === item.key);

      if (index > -1) {
        const item = newData[index];
        const updatedItem = { ...item, ...row };

        const uniqueCheck = newData.every(
          (item) =>
            item.key === key ||
            (item.part_no !== updatedItem.part_no && item.plc_data !== updatedItem.plc_data)
        );
        if (!uniqueCheck) {
          const duplicateItem = newData.find(
            (item) => item.part_no === updatedItem.part_no && item.key !== key
          );
          if (duplicateItem) {
            message.error("Please change the part number, it must be unique!");
          } else {
            message.error("Please change the plc data, it must be unique!");
          }
          return;
        }

        const { key: omitKey, ...savedItem } = updatedItem;
        newData.splice(index, 1, updatedItem);
        setData(newData);
        setEditingKey("");

        if (UploadList.length < 1) {
          savetoDb(savedItem, savedItem.image_path);
        } else {
          try {
            const formData = new FormData();
            UploadList.forEach((file) => {
              formData.append("file_uploads", file.originFileObj as File);
            });

            const response = await axiosInstance.post(
              "/commons/upload",
              formData
            );

            if (response.status === 200 || response.data.length < 1) {
              savetoDb(savedItem, response.data);
              setUploadList([]);
            }
          } catch (err) {
            return err;
          }
        }
      }
    } catch (err) {
      return err;
    }
  };

  //*********************detect state for change the image when upload on table**************************
  useEffect(() => {
    if (form.getFieldValue("LineName") !== undefined) {
      showData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DefaultImage]);


  //*************** API post (post_edit_data) ********** condition for post use with add row (true) ***********
  const post_edit_data = async (upsertItem: EditData) => {
    try {
      const response = await axiosInstance.post(
        "/commons/post_edit_data",
        upsertItem
      );
      if (response.status === 200) {
        message.success("Upload successfully");
      } else {
      }
    } catch (error) {
      console.error("Error Upload data:", error);
    }
  };

  //********************** API delete (delete_row) **************************
  const delete_row = async (id: id_row) => {
    try {
      const response = await axiosInstance.post("/commons/delete_row", id);
      if (response.status === 200) {
        message.success("Delete successfully");
      }
    } catch (error) {
      console.error("Error delete data:", error);
    }
  };

  //********************** API update (put_edit_wi) ***** condition for post use with edit (true), add row(false) **********
  const update_row = async (upsertItem: UpData) => {
    // console.log("Update Row:", upsertItem);
    try {
      const response = await axiosInstance.put(
        "/commons/put_edit_wi",
        upsertItem
      );
      if (response.status === 200) {
        message.success("Update successfully");
      }
    } catch (error) {
      console.error("Error delete data:", error);
    }
  };

  const unique = new Set();
  const distinct_line_name = LineName.filter((entry: any) => {
    const isUnique = !unique.has(entry.line_id);
    unique.add(entry.line_id);
    return isUnique;
  });

  const distinct_part_no = PartNo.filter((entry: any) => {
    const isUnique = !unique.has(entry.part_no);
    unique.add(entry.part_no);
    return isUnique;
  });

  //get data in table ex.image path, plc data, part no., uddate time etc.
  const showData = async () => {
    // setEditingKey("");

    const line_id = form.getFieldValue("LineName") || "0";
    const part_no = form.getFieldValue("Part Number") || "0";
    const response_wi = await axiosInstance.get("/commons/get_wi_data");
    const responsedata = await axiosInstance.get("/commons/get_wi_table", {
      params: {
        line_id: line_id,
        process_id: part_no,
      },
    });

    if (responsedata.status === 200 && line_id != 0 && part_no != 0) {
      const dataWithKeys = responsedata.data.map(
        (item: any, index: number) => ({
          key: (index + 1).toString(),
          ...item,
        })
      );
      setData(dataWithKeys);
      // setDisabled(false);
    } else {
      // setDisabled(true);
    }

    if (response_wi.status === 200) {
      const maxId = Math.max(...response_wi.data.map((item: any) => item.id));
      setMaxId(maxId);
    }
  };

  const onDeleteButtonClick = async (key: React.Key) => {
    const newData = Data.filter((item: any) => item.key !== key);
    const updatedData = newData.map((item: any, index: any) => ({
      ...item,
      key: String(index + 1),
    }));
    setData(updatedData);
  };

  const onAddButtonClick = () => {
    // form.resetFields(["plc_data", "part_no"]);
    if (!EditingKey) {
      const newId = MaxId + 1;
      const newData: Item = {
        key: String(Data.length + 1),
        id: newId,
        part_no: "",
        plc_data: "",
        image_path: [],
        update_at: time_thai,
      };
      setData([...Data, newData]);
      setEditingKey(newData.key);
    }
  };

  const columns = [
    {
      title: "Mode",
      dataIndex: "part_no",
      editable: true,
      // onFilter: (value: any, record: Item) =>
      //   record.part_no.toLowerCase().includes(value.toLowerCase()),
      // filterIcon: (filtered: any) => (
      //   <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      // ),
      // filteredValue: SearchText ? [SearchText] : null,
      render: (text: string, record: Item) => {
        const editable = isEditing(record);
        if (editable) {
          return (
            <Form.Item
              name="part_no"
              rules={[
                {
                  required: true,
                  message: "Please Input Part Number!",
                },
              ]}
            >
              <Input />
            </Form.Item>
          );
        // } else if (!SearchText) {
        //   return <span> {text} </span>;
        // } else {
        //   const searchRegex = new RegExp(`(${SearchText})`, "gi");
        //   const parts = text.split(searchRegex);
        //   return (
        //     <span>
        //       {parts.map((part, index) =>
        //         searchRegex.test(part) ? (
        //           <span key={index} style={{ backgroundColor: "#ffc069" }}>
        //             {part}
        //           </span>
        //         ) : (
        //           part
        //         )
        //       )}
        //     </span>
        //   );
        }
      },
    },
    {
      title: "Target by Item",
      dataIndex: "plc_data",
      editable: true,
      render: (_: any, record: Item) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="plc_data"
            rules={[
              {
                required: true,
                message: `Please Input PLC Data`,
              },
            ]}
          >
            <Input />
          </Form.Item>
        ) : (
          record.plc_data
        );
      },
    },
    
    {
      title: "Update Time",
      dataIndex: "update_at",
      width: 250,
      render: (update_at: string) => (
        <div className="update_at">{update_at}</div>
      ),
    },

    {
      title: "Action",
      dataIndex: "action",
      width: 200,
      render: (_: any, record: Item) => {
        const editable = isEditing(record);
        // console.log("test", record);
        return (
          <span className="actions-group">
            {editable ? (
              <span>
                <Tooltip title="Save">
                  <Button
                    type="primary"
                    // onClick={() => save(record.key)}
                    // disabled={
                    //   UploadList.length < 1 && AddRowClick ? true : false
                    // }
                    style={{
                      boxShadow: "3px 3px 10px ",
                      width: "50px",
                      marginRight: "10px",
                    }}
                  >
                    <SaveOutlined
                      style={{ fontSize: "20px", textAlign: "center" }}
                    />
                  </Button>
                </Tooltip>

                <Tooltip title="Cancel">
                  <Button
                    type="primary"
                    onClick={async () => {
                      const ID = {
                        id: record.id,
                      };
                      if (record.part_no !== "" && record.plc_data !== "") {
                        cancel(record);
                      } else {
                        onDeleteButtonClick(record.key);
                        delete_row(ID);
                        setEditingKey("");
                      }
                    }}
                    style={{
                      boxShadow: "3px 3px 10px 0px",
                      width: "50px",
                      marginLeft: "10px",
                    }}
                  >
                    <CloseOutlined style={{ fontSize: "20px" }} />
                  </Button>
                </Tooltip>
              </span>
            ) : (
              <span>
                <Tooltip title="Edit">
                  <Button
                    type="primary"
                    disabled={EditingKey !== "" && EditingKey !== record.key}
                    onClick={() => {
                      edit(record);
                    }}
                    style={{
                      boxShadow: "3px 3px 10px 0px",
                      width: "50px",
                      marginRight: "10px",
                    }}
                  >
                    <EditOutlined style={{ fontSize: "20px" }} />
                  </Button>
                </Tooltip>

                <Tooltip title="Delete">
                  <Popconfirm
                    title="Sure to delete?"
                    onConfirm={async () => {
                      const ID = {
                        id: record.id,
                      };
                      onDeleteButtonClick(record.key);
                      delete_row(ID);
                    }}
                  >
                    <Button
                      type="primary"
                      danger
                      disabled={EditingKey !== "" && EditingKey !== record.key}
                      style={{
                        boxShadow: "3px 3px 10px 0px",
                        width: "50px",
                        marginLeft: "10px",
                      }}
                    >
                      <DeleteOutlined style={{ fontSize: "20px" }} />
                    </Button>
                  </Popconfirm>
                </Tooltip>
              </span>
            )}
          </span>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: Item) => ({
        record,
        inputType: col.dataIndex,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <div>
      <div className="header">
        <div className="box_header">
          <Form
            className="form_selector"
            form={form}
            // onFinish={(x) => console.log(x)}
          >
            <FormItem
              name="LineName"
              rules={[{ 
                required: true, 
                message: "Line Name is required" 
              }]}
              label={<span className="label_name"> Line Name </span>}
            >
              <Select
                showSearch
                placeholder="Select a LineName"
                style={{ width: 450 }}
                onSelect={(value) => LineNameChange(value)}
                onChange={(value) => LineNameChange(value)}
                allowClear
                // optionFilterProp="children"
                // filterOption={(input, option) =>
                //   ((option?.label as string) ?? "")
                //     .toLowerCase()
                //     .includes(input.toLowerCase())
                // }
              >
                {distinct_line_name.map((item: any) => (
                  <Select.Option
                    key={item.line_id}
                    value={item.line_id}
                    // label={item.line_name}
                  >
                    {item.line_name}
                  </Select.Option>
                ))}
              </Select>
            </FormItem>

            <FormItem
              name="Part Number"
              rules={[{ 
                required: true, 
                message: "Part Number is required" 
              }]}
              label={<span className="label_name"> Part Number </span>}
            >
              <Select
                showSearch
                allowClear
                placeholder="Select a Part Number"
                style={{ width: 350 }}
                onSelect={PartNoChange}
                onChange={PartNoChange}
                // disabled={distinct_process < 1}
              >
                {distinct_part_no.map((item: any) => (
                  <Select.Option
                    key={item.part_id}
                    value={item.part_no}
                    // label={item.part_no}
                  >
                    {item.part_no}
                  </Select.Option>
                ))}
              </Select>
            </FormItem>

            <FormItem 
              name="Category"
              rules={[{ 
                required: true, 
                message: "Process is required" 
              }]}
              label={<span className="label_name"> Category </span>}
            >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select a Part Number"
                  style={{ width: 350 }}
                  // onSelect={DisplayChange}
                  // onChange={DisplayChange}
                  // disabled={distinct_process < 1}
                >
                  {Category.map((item: any) => (
                    <Select.Option
                      key={item.id}
                      value={item.category}
                      label={item.category}
                  >
                    {item.category}
                  </Select.Option>
                  ))}
                </Select>
            </FormItem>
              
            <FormItem className="form_search">
              <Button
                type="primary"
                onClick={showData}
                htmlType="submit"
                style={{ fontSize: 15, boxShadow: "3px 3px 10px 0px " }}
              >
                Search
                <SearchOutlined />
              </Button>
            </FormItem>
          </Form>
        </div>
      </div>

      <div>
        <Form 
          form={form} 
          // component={false}
        >
          <div style={{ display: "flex" }}>
            <FormItem className="form_add_image">
              <Tooltip title="Add Image">
                <Button
                  type="primary"
                  onClick={() => {
                    onAddButtonClick();
                    setAddRowClick(true);
                  }}
                  style={{ boxShadow: "3px 3px 10px 0px" }}
                  icon={<PlusOutlined />}
                  // disabled={IsDisabled}
                >
                  Add
                </Button>
              </Tooltip>
            </FormItem>
          </div>

          <div className="table_container">
            <Table
              className="edit_table"
              dataSource={Data}         
              columns={mergedColumns}
              rowClassName="editable-row"
              pagination={false}
              scroll={{ y: 590 }}
              rowKey={(record: any) => record.key}
              style={{ paddingBottom: "0.5rem" }}
            />
          </div>
        </Form>
      </div>
    </div>
  );
};
export default App;
